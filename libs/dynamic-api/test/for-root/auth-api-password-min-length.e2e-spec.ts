import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createUpdatePasswordUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - useAuth with password.minLength (e2e)', () => {
  const User = createUpdatePasswordUserEntity();
  type User = InstanceType<typeof User>;

  const user = { email: 'user@test.co', password: 'user-password' };
  let model: mongoose.Model<User>;

  const fixtures = async (_: Connection) => {
    const bcryptService = new BcryptService();
    model = await getModelFromEntity(User);
    await model.insertMany([{ ...user, password: await bcryptService.hashPassword(user.password) }]);
  };

  const resetPasswordTokenOf = async (email: string): Promise<string> => {
    await server.post('/auth/reset-password', { email });
    const { refreshTokenHash: resetPasswordToken } = await model.findOne({ email }).lean().exec();
    return resetPasswordToken;
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with password.minLength', () => {
    beforeEach(async () => {
      await initModule({
        useAuth: {
          userEntity: User,
          password: { minLength: 8 },
          resetPassword: {
            emailField: 'email',
            // The reset token is parked in `refreshTokenHash` (any string field does) so the test can read it back.
            resetPasswordCallback: async ({ resetPasswordToken }, { updateUserByEmail }) => {
              await updateUserByEmail({ $set: { refreshTokenHash: resetPasswordToken } });
            },
          },
        },
      }, fixtures);
    });

    describe('POST /auth/register', () => {
      it('should return 400 with a class-validator-style message when the password is too short', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'new@test.co', password: 'short' });

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['password must be longer than or equal to 8 characters'],
          statusCode: 400,
        });
        expect(await model.countDocuments({ email: 'new@test.co' })).toBe(0);
      });

      it('should report the missing login field together with the length check', async () => {
        const { body, status } = await server.post('/auth/register', { password: 'short' });

        expect(status).toBe(400);
        expect(body.message).toEqual([
          'email property is required',
          'password must be longer than or equal to 8 characters',
        ]);
      });

      it('should register when the password is long enough', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'new@test.co', password: 'long-enough' });

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });
    });

    describe('PATCH /auth/change-password', () => {
      it('should return 400 when newPassword is too short, before touching the token', async () => {
        const { body, status } = await server.patch(
          '/auth/change-password',
          { resetPasswordToken: 'not-even-a-token', newPassword: 'short' },
        );

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['newPassword must be longer than or equal to 8 characters'],
          statusCode: 400,
        });
      });

      it('should change the password when newPassword is long enough', async () => {
        const resetPasswordToken = await resetPasswordTokenOf(user.email);

        const { status } = await server.patch('/auth/change-password', { resetPasswordToken, newPassword: 'long-enough' });

        expect(status).toBe(204);
        const { status: loginStatus } = await server.post('/auth/login', { email: user.email, password: 'long-enough' });
        expect(loginStatus).toBe(200);
      });
    });
  });

  describe('without password.minLength (default)', () => {
    beforeEach(async () => {
      await initModule({ useAuth: { userEntity: User } }, fixtures);
    });

    it('should accept any non-empty password on register', async () => {
      const { status } = await server.post('/auth/register', { email: 'new@test.co', password: 'a' });

      expect(status).toBe(201);
    });
  });
});
