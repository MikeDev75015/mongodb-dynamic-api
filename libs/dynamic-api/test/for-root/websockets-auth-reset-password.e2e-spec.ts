import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Connection } from 'mongoose';
import { BcryptService, DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import {
  closeTestingApp,
  handleSocketException,
  handleSocketResponse,
  server,
} from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity, wait } from '../utils';
import { createResetPasswordUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Websockets useAuth with resetPassword options (e2e)', () => {
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

    app = await initModule(
      {
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
        webSocket: true,
      }, fixtures,
      async (_: INestApplication) => {
        _.useWebSocketAdapter(new SocketAdapter(_));
      },
    );
  });

  describe('EVENT auth-reset-password', () => {
    it(
      'should throw a ws exception if email is missing if no validation options are provided',
      async () => {
        await server.emit('auth-reset-password', {});

        expect(handleSocketException).toHaveBeenCalledTimes(1);
        expect(handleSocketException).toHaveBeenCalledWith({
          message: 'Invalid or missing argument',
        });
        expect(handleSocketResponse).not.toHaveBeenCalled();
      }
    );

    it(
      'should not throw a ws exception if email is invalid if no validation options are provided',
      async () => {
        await server.emit('auth-reset-password', { email: 'unit.test.co' });

        expect(handleSocketException).not.toHaveBeenCalled();
        expect(handleSocketResponse).toHaveBeenCalledTimes(1);
      }
    );

    it('should not throw a ws exception if email is not found', async () => {
      await server.emit('auth-reset-password', { email: 'invalid@test.co' });

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledTimes(1);
    });

    describe('resetPasswordCallback', () => {
      it('should set resetPasswordToken if email is valid', async () => {
        const { email } = user;
        const { resetPasswordToken: resetPasswordTokenBeforeUpdate } = (
          await model.findOne({ email }).lean().exec()
        ) as User;

        await server.emit('auth-reset-password', { email });

        const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
          await model.findOne({ email }).lean().exec()
        ) as User;

        expect(handleSocketException).not.toHaveBeenCalled();
        expect(handleSocketResponse).toHaveBeenCalledTimes(1);
        expect(resetPasswordTokenBeforeUpdate).toStrictEqual(undefined);
        expect(resetPasswordTokenAfterUpdate).toStrictEqual(expect.any(String));
      });
    });
  });

  describe('EVENT auth-change-password', () => {
    it('should throw a ws exception if resetPasswordToken is missing', async () => {
      await server.emit('auth-change-password', { newPassword: 'test' });

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith({
        message: 'Invalid or missing argument',
      });
      expect(handleSocketResponse).not.toHaveBeenCalled();
    });

    it('should throw a ws exception if newPassword is missing', async () => {
      await server.emit('auth-change-password', { resetPasswordToken: 'resetPasswordToken' });

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith({
        message: 'Invalid or missing argument',
      });
      expect(handleSocketResponse).not.toHaveBeenCalled();
    });

    it('should throw a ws exception if resetPasswordToken is invalid', async () => {
      await server.emit(
        'auth-change-password',
        { resetPasswordToken: 'test', newPassword: 'newPassword' },
      );

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith({
        message: 'Invalid reset password token. Please redo the reset password process.',
      });
      expect(handleSocketResponse).not.toHaveBeenCalled();
    });

    it('should throw a ws exception if resetPasswordToken is expired', async () => {
      const jwtService = app.get<JwtService>(JwtService);
      const expiredResetPasswordToken = jwtService.sign({ email: user.email }, { expiresIn: 1 });
      await wait(500);

      await server.emit(
        'auth-change-password',
        { resetPasswordToken: expiredResetPasswordToken, newPassword: 'newPassword' },
      );

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith({
        message: 'Time to reset password has expired. Please redo the reset password process.',
      });
      expect(handleSocketResponse).not.toHaveBeenCalled();
    });

    describe('changePasswordAbilityPredicate', () => {
      let resetPasswordToken: string;

      beforeEach(async () => {
        await server.emit('auth-reset-password', { email: client.email });
        handleSocketResponse.mockReset();

        const { resetPasswordToken: token } = (
          await model.findOne({ email: client.email }).lean().exec()
        ) as User;

        resetPasswordToken = token;
      });

      it('should throw a ws exception if user is not allowed to change password', async () => {
        await server.emit(
          'auth-change-password',
          { resetPasswordToken, newPassword: 'newPassword' },
        );

        expect(handleSocketException).toHaveBeenCalledTimes(1);
        expect(handleSocketException).toHaveBeenCalledWith({
          message: 'You are not allowed to change your password.',
        });
        expect(handleSocketResponse).not.toHaveBeenCalled();
      });
    });

    describe('changePasswordCallback', () => {
      let resetPasswordToken: string;

      beforeEach(async () => {
        await server.emit('auth-reset-password', { email: user.email });
        handleSocketResponse.mockReset();

        const { resetPasswordToken: token } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        resetPasswordToken = token;
      });

      it('should change password and unset resetPasswordToken if resetPasswordToken is valid', async () => {
        const newPassword = 'newPassword';
        const bcryptService = app.get<BcryptService>(BcryptService);
        const { password: passwordBeforeUpdate } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        await server.emit(
          'auth-change-password',
          { resetPasswordToken, newPassword },
        );

        const { password: passwordAfterUpdate, resetPasswordToken: tokenAfterUpdate } = (
          await model.findOne({ email: user.email }).lean().exec()
        ) as User;

        const isPreviousPassword = await bcryptService.comparePassword(user.password, passwordBeforeUpdate);
        expect(isPreviousPassword).toBe(true);

        const isNewPassword = await bcryptService.comparePassword(newPassword, passwordAfterUpdate);
        expect(isNewPassword).toBe(true);

        expect(tokenAfterUpdate).toStrictEqual(undefined);

        expect(handleSocketException).not.toHaveBeenCalled();
        expect(handleSocketResponse).toHaveBeenCalledTimes(1);
      });
    });
  });
});

