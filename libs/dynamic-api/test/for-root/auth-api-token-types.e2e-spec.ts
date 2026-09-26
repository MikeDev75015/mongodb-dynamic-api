import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createResetPasswordUserEntity, initModule } from '../shared';

/**
 * E2E — every token MDA signs carries a `typ` claim and is only accepted where that type is
 * expected; reset-password tokens are verified (not just decoded) and single use.
 */
describe('DynamicApiModule forRoot - token types and reset-password tokens (e2e)', () => {
  const User = createResetPasswordUserEntity();
  type User = InstanceType<typeof User>;

  const email = 'token-types@test.co';
  const password = 'initial-password';
  const invalidResetTokenBody = {
    error: 'Bad Request',
    message: 'Invalid reset password token. Please redo the reset password process.',
    statusCode: 400,
  };

  let app: INestApplication;
  let lastResetPasswordToken: string | undefined;

  const requestResetPasswordToken = async () => {
    await server.post('/auth/reset-password', { email });
    return lastResetPasswordToken as string;
  };

  const changePassword = (resetPasswordToken: string, newPassword = 'new-password') =>
    server.patch('/auth/change-password', { resetPasswordToken, newPassword });

  const login = async (pass = password) => {
    const { body } = await server.post('/auth/login', { email, password: pass });
    return body as { accessToken: string; refreshToken: string };
  };

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();
    lastResetPasswordToken = undefined;

    const fixtures = async (_: Connection) => {
      const model = await getModelFromEntity(User);
      await model.create({ email, password: await new BcryptService().hashPassword(password) });
    };

    app = await initModule({
      useAuth: {
        userEntity: User,
        jwt: { secret: 'token-types-secret' },
        resetPassword: {
          emailField: 'email',
          expirationInMinutes: 5,
          resetPasswordCallback: async ({ resetPasswordToken }: { resetPasswordToken: string; email: string }) => {
            lastResetPasswordToken = resetPasswordToken;
          },
        },
      },
    }, fixtures);
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('PATCH /auth/change-password', () => {
    it('should change the password with a genuine reset token', async () => {
      const resetPasswordToken = await requestResetPasswordToken();

      const { status } = await changePassword(resetPasswordToken, 'brand-new-password');

      expect(status).toBe(204);
      expect(await login('brand-new-password')).toEqual(expect.objectContaining({ accessToken: expect.any(String) }));
    });

    it('should reject a token signed with another secret (forged)', async () => {
      const forged = new JwtService({ secret: 'attacker-secret' }).sign({ email, typ: 'reset' }, { expiresIn: '5m' });

      const { status, body } = await changePassword(forged);

      expect(status).toBe(400);
      expect(body).toEqual(invalidResetTokenBody);
    });

    it('should reject a correctly signed token without the reset type', async () => {
      const untyped = app.get<JwtService>(JwtService).sign({ email });

      const { status, body } = await changePassword(untyped);

      expect(status).toBe(400);
      expect(body).toEqual(invalidResetTokenBody);
    });

    it('should reject an access token used as a reset token', async () => {
      const { accessToken } = await login();

      const { status } = await changePassword(accessToken);

      expect(status).toBe(400);
    });

    it('should reject a reset token a second time (single use)', async () => {
      const resetPasswordToken = await requestResetPasswordToken();
      await changePassword(resetPasswordToken, 'first-change');

      const { status, body } = await changePassword(resetPasswordToken, 'second-change');

      expect(status).toBe(400);
      expect(body).toEqual(invalidResetTokenBody);
      expect(await login('first-change')).toEqual(expect.objectContaining({ accessToken: expect.any(String) }));
    });

    it('should reject an older reset token once the password was changed with a newer one', async () => {
      const olderToken = await requestResetPasswordToken();
      const newerToken = await requestResetPasswordToken();
      await changePassword(newerToken, 'changed-with-newer-token');

      const { status } = await changePassword(olderToken, 'changed-with-older-token');

      expect(status).toBe(400);
    });
  });

  describe('access and refresh tokens', () => {
    it('should reject a refresh token used as an access token', async () => {
      const { accessToken, refreshToken } = await login();

      expect((await server.get('/auth/account', { authToken: accessToken })).status).toBe(200);
      expect((await server.get('/auth/account', { authToken: refreshToken })).status).toBe(401);
    });

    it('should reject an access token without typ (signed before v5.4.2)', async () => {
      const { body: account } = await server.get('/auth/account', { authToken: (await login()).accessToken });
      const untypedAccessToken = app.get<JwtService>(JwtService).sign({ id: account.id, email });

      expect((await server.get('/auth/account', { authToken: untypedAccessToken })).status).toBe(401);
    });

    it('should reject an access token used as a refresh token', async () => {
      const { accessToken, refreshToken } = await login();

      const withAccessToken = await server.post('/auth/refresh-token', {}, { authToken: accessToken });
      const withRefreshToken = await server.post('/auth/refresh-token', {}, { authToken: refreshToken });

      expect(withAccessToken.status).toBe(401);
      expect(withRefreshToken.status).toBe(200);
    });
  });
});
