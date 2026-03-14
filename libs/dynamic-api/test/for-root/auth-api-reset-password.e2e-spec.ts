import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Connection } from 'mongoose';
import { BcryptService, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity, wait } from '../utils';
import { createResetPasswordUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - useAuth with resetPassword options (e2e)', () => {
  const User = createResetPasswordUserEntity();
  type User = InstanceType<typeof User>;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });


  let model: mongoose.Model<User>;
  let user: User;
  let client: User;
  let app: INestApplication;

  beforeEach(async () => {
    user = { email: 'user@test.co', password: 'user', isVerified: true } as User;
    client = { email: 'client@test.co', password: 'client' } as User;

    const bcryptService = new BcryptService();

    const fixtures = async (_: Connection) => {
      model = await getModelFromEntity(User);
      await model.insertMany([
        { ...user, password: await bcryptService.hashPassword(user.password) },
        { ...client, password: await bcryptService.hashPassword(client.password) },
      ]);
    };

    app = await initModule({
      useAuth: {
        userEntity: User,
        resetPassword: {
          emailField: 'email',
          expirationInMinutes: 1,
          resetPasswordCallback: async (
            { resetPasswordToken }: { resetPasswordToken: string; email: string },
            { updateUserByEmail },
          ) => {
            await updateUserByEmail({ $set: { resetPasswordToken } });
          },
          changePasswordAbilityPredicate: (user: User) => user.isVerified && !!user.resetPasswordToken,
          changePasswordCallback: async (user: User, { updateOneDocument }) => {
            await updateOneDocument(User, { _id: user.id }, { $unset: { resetPasswordToken: 1 } });
          },
        },
      },
    }, fixtures);
  });

  describe('POST /auth/reset-password', () => {
    it(
      'should throw a bad request exception if email is missing if no validation options are provided',
      async () => {
        const { body, status } = await server.post('/auth/reset-password', {});

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: 'Invalid or missing argument',
          statusCode: 400,
        });
      }
    );

    it(
      'should not throw a bad request exception if email is invalid if no validation options are provided',
      async () => {
        const { body, status } = await server.post('/auth/reset-password', { email: 'unit.test.co' });

        expect(status).toBe(204);
        expect(body).toEqual({});
      }
    );

    it('should not throw an exception if email is not found', async () => {
      const { body, status } = await server.post('/auth/reset-password', { email: 'invalid@test.co' });

      expect(status).toBe(204);
      expect(body).toEqual({});
    });

    describe('resetPasswordCallback', () => {
      it('should set resetPasswordToken if email is valid', async () => {
        const { email } = user;
        const { resetPasswordToken: resetPasswordTokenBeforeUpdate } = (
          await model.findOne({ email }).lean().exec()
        ) as User;

        const { status } = await server.post('/auth/reset-password', { email });
        const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
          await model.findOne({ email }).lean().exec()
        ) as User;

        expect(status).toBe(204);
        expect(resetPasswordTokenBeforeUpdate).toStrictEqual(undefined);
        expect(resetPasswordTokenAfterUpdate).toStrictEqual(expect.any(String));
      });
    });
  });

  describe('PATCH /auth/change-password', () => {
    it('should throw a bad request exception if resetPasswordToken is missing', async () => {
      const { body, status } = await server.patch('/auth/change-password', { newPassword: 'test' });

      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Invalid or missing argument',
        statusCode: 400,
      });
    });

    it('should throw a bad request exception if newPassword is missing', async () => {
      const { email } = user;
      await server.post('/auth/reset-password', { email });
      const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
        await model.findOne({ email }).lean().exec()
      ) as User;

      const resetPasswordToken = resetPasswordTokenAfterUpdate;
      const { body, status } = await server.patch('/auth/change-password', { resetPasswordToken });

      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Invalid or missing argument',
        statusCode: 400,
      });
    });

    it('should throw an unauthorized exception if resetPasswordToken is invalid', async () => {
      const { body, status } = await server.patch(
        '/auth/change-password',
        { resetPasswordToken: 'test', newPassword: 'newPassword' },
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'Bad Request',
        message: 'Invalid reset password token. Please redo the reset password process.',
        statusCode: 400,
      });
    });

    it('should throw an unauthorized exception if resetPasswordToken is expired', async () => {
      const jwtService = app.get<JwtService>(JwtService);
      const expiredResetPasswordToken = jwtService.sign({ email: user.email }, { expiresIn: 1 });
      await wait(500);
      const { body, status } = await server.patch(
        '/auth/change-password',
        { resetPasswordToken: expiredResetPasswordToken, newPassword: 'newPassword' },
      );

      expect(status).toBe(401);
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Time to reset password has expired. Please redo the reset password process.',
        statusCode: 401,
      });
    });

    describe('changePasswordAbilityPredicate', () => {
      let resetPasswordToken: string;

      beforeEach(async () => {
        await server.post('/auth/reset-password', { email: client.email });

        const { resetPasswordToken: token } = (
          await model.findOne({ email: client.email }).lean().exec()
        ) as User;

        resetPasswordToken = token;
      });

      it('should throw a forbidden exception if user is not allowed to change password', async () => {
        expect(resetPasswordToken).toStrictEqual(expect.any(String));

        const { body, status } = await server.patch(
          '/auth/change-password',
          { resetPasswordToken, newPassword: 'newPassword' },
        );

        expect(status).toBe(403);
        expect(body).toEqual({
          error: 'Forbidden',
          message: 'You are not allowed to change your password.',
          statusCode: 403,
        });
      });
    });

    describe('changePasswordCallback', () => {
      let resetPasswordToken: string;

      beforeEach(async () => {
        await server.post('/auth/reset-password', { email: user.email });

        const { resetPasswordToken: token } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        resetPasswordToken = token;
      });

      it('should change password and unset resetPasswordToken if resetPasswordToken is valid', async () => {
        expect(resetPasswordToken).toStrictEqual(expect.any(String));

        const newPassword = 'newPassword';
        const bcryptService = app.get<BcryptService>(BcryptService);
        const { password: passwordBeforeUpdate } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        const { status } = await server.patch(
          '/auth/change-password',
          { resetPasswordToken, newPassword },
        );

        const { password: passwordAfterUpdate, resetPasswordToken: tokenAfterUpdate } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        const isPreviousPassword = await bcryptService.comparePassword(user.password, passwordBeforeUpdate);
        expect(isPreviousPassword).toBe(true);

        const isNewPassword = await bcryptService.comparePassword(newPassword, passwordAfterUpdate);
        expect(isNewPassword).toBe(true);

        expect(status).toBe(204);
        expect(tokenAfterUpdate).toStrictEqual(undefined);
      });
    });
  });
});

