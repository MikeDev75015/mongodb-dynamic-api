import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule, mintTokenPair, parseRefreshSessions } from '../../src';
import { DynamicApiRefreshTokenOptions } from '../../src/modules/auth/interfaces';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createUserWithRefreshTokenEntity, initModule, UserWithRefreshTokenEntityType } from '../shared';
import { TEST_JWT_SECRETS } from '../shared/test-jwt';

type TokenPair = { accessToken: string; refreshToken: string };
type RefreshClaims = { sid?: string; jti: string; id: string };

describe('DynamicApiModule forRoot - refreshToken.multiSession (e2e)', () => {
  const User = createUserWithRefreshTokenEntity();
  const email = 'multi@test.co';
  const password = 'test';

  let app: INestApplication;
  let model: mongoose.Model<UserWithRefreshTokenEntityType>;
  let capturedOtp: string | undefined;
  let capturedResetToken: string | undefined;

  const refresh = (refreshToken: string) =>
    server.post('/auth/refresh-token', {}, { headers: { Authorization: `Bearer ${refreshToken}` } });

  const login = async (): Promise<TokenPair> => (await server.post('/auth/login', { email, password })).body;

  const claimsOf = (token: string) => new JwtService().decode(token) as RefreshClaims;

  const storedSessions = async () => {
    const user = await model.findOne({ email }).lean().exec();
    return parseRefreshSessions(user?.refreshTokenHash).sessions;
  };

  const initApp = async (refreshToken: DynamicApiRefreshTokenOptions<UserWithRefreshTokenEntityType>) => {
    app = await initModule({
      useAuth: {
        userEntity: User,
        jwt: { ...TEST_JWT_SECRETS, expiresIn: '1m', refreshTokenExpiresIn: '1h' },
        refreshToken: { refreshTokenField: 'refreshTokenHash', ...refreshToken },
        updateAccount: { refreshTokenOnUpdate: true },
        resetPassword: {
          emailField: 'email',
          resetPasswordCallback: async ({ resetPasswordToken }: { resetPasswordToken: string }) => {
            capturedResetToken = resetPasswordToken;
          },
        },
        passwordless: {
          sendCodeCallback: async (_identifier: string, code: string) => {
            capturedOtp = code;
          },
        },
      },
    });
    model = await getModelFromEntity(User);
    await server.post('/auth/register', { email, password });
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
    capturedOtp = undefined;
    capturedResetToken = undefined;
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with multiSession: true', () => {
    beforeEach(async () => {
      await initApp({ multiSession: true, reuseWindowMs: 10_000 });
    });

    it('should keep device A logged in after device B logs in', async () => {
      const deviceA = await login();
      const deviceB = await login();

      const { status: statusA, body: rotatedA } = await refresh(deviceA.refreshToken);
      const { status: statusB } = await refresh(deviceB.refreshToken);

      expect(statusA).toBe(200);
      expect(statusB).toBe(200);
      expect(claimsOf(deviceA.refreshToken).sid).toEqual(expect.any(String));
      expect(claimsOf(deviceA.accessToken).sid).toBe(claimsOf(deviceA.refreshToken).sid);
      expect(claimsOf(rotatedA.refreshToken).sid).toBe(claimsOf(deviceA.refreshToken).sid);
      expect(claimsOf(deviceB.refreshToken).sid).not.toBe(claimsOf(deviceA.refreshToken).sid);
      // The register call opened a session too.
      expect(Object.keys(await storedSessions())).toHaveLength(3);
    });

    it('should keep device A logged in after device B gets a pair through mintTokenPair', async () => {
      const deviceA = await login();
      const user = await model.findOne({ email }).lean().exec();

      const deviceB = await mintTokenPair(User, { ...user, id: user._id.toString() } as UserWithRefreshTokenEntityType);

      expect((await refresh(deviceA.refreshToken)).status).toBe(200);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    it('should keep device A logged in after device B logs in with an OTP', async () => {
      const deviceA = await login();
      await server.post('/auth/passwordless/send-code', { identifier: email });
      const { body: deviceB } = await server.post('/auth/passwordless/verify-code', { identifier: email, code: capturedOtp });

      expect((await refresh(deviceA.refreshToken)).status).toBe(200);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    it('should only log out the device that calls logout', async () => {
      const deviceA = await login();
      const deviceB = await login();

      const { status } = await server.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${deviceA.refreshToken}` } });

      expect(status).toBe(204);
      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    it('should log out every device on POST /auth/logout-all', async () => {
      const deviceA = await login();
      const deviceB = await login();

      const { status } = await server.post('/auth/logout-all', {}, { headers: { Authorization: `Bearer ${deviceA.refreshToken}` } });

      expect(status).toBe(204);
      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(401);
    });

    it('should only rotate the caller session on PATCH /auth/account with refreshTokenOnUpdate', async () => {
      const deviceA = await login();
      const deviceB = await login();
      const sessionCount = Object.keys(await storedSessions()).length;

      const { status, body: updatedA } = await server.patch('/auth/account', { role: 'admin' }, { authToken: deviceA.accessToken });

      expect(status).toBe(200);
      expect(claimsOf(updatedA.refreshToken).sid).toBe(claimsOf(deviceA.refreshToken).sid);
      expect(Object.keys(await storedSessions())).toHaveLength(sessionCount);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
      expect((await refresh(updatedA.refreshToken)).status).toBe(200);
    });

    it('should not return any 401 when two devices refresh in parallel', async () => {
      const deviceA = await login();
      const deviceB = await login();

      const results = await Promise.all([refresh(deviceA.refreshToken), refresh(deviceB.refreshToken)]);

      expect(results.map(({ status }) => status)).toEqual([200, 200]);
    });

    it('should return the same pair to two parallel refreshes of the same token within the grace window', async () => {
      const deviceA = await login();

      const [first, second] = await Promise.all([refresh(deviceA.refreshToken), refresh(deviceA.refreshToken)]);

      expect([first.status, second.status]).toEqual([200, 200]);
      expect(second.body).toEqual(first.body);
    });

    it('should accept a legacy record and a token without sid, then migrate the record to v2', async () => {
      const user = await model.findOne({ email }).lean().exec();
      const legacyToken = new JwtService().sign(
        { id: user._id.toString(), email, typ: 'refresh', jti: 'legacy-jti' },
        { secret: TEST_JWT_SECRETS.refreshSecret, expiresIn: '1h' },
      );
      const currentHash = await new BcryptService().hashPassword('legacy-jti');
      await model.updateOne({ email }, { $set: { refreshTokenHash: JSON.stringify({ currentHash }) } }).exec();

      const { status, body } = await refresh(legacyToken);

      expect(status).toBe(200);
      const newSid = claimsOf(body.refreshToken).sid;
      expect(newSid).toEqual(expect.any(String));
      const stored = await model.findOne({ email }).lean().exec();
      expect(JSON.parse(stored.refreshTokenHash)).toMatchObject({ v: 2, sessions: { [newSid]: { migratedFrom: 'legacy' } } });
      expect((await refresh(body.refreshToken)).status).toBe(200);
    });

    it('should reject every device once the field is emptied by the app', async () => {
      const deviceA = await login();
      const deviceB = await login();

      await model.updateOne({ email }, { $set: { refreshTokenHash: '' } }).exec();

      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(401);
    });

    it('should revoke every session when the password is changed', async () => {
      const deviceA = await login();
      const deviceB = await login();
      await server.post('/auth/reset-password', { email });

      const { status } = await server.patch('/auth/change-password', { resetPasswordToken: capturedResetToken, newPassword: 'new-pass' });

      expect(status).toBe(204);
      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(401);
    });
  });

  describe('with maxSessions: 2', () => {
    beforeEach(async () => {
      await initApp({ multiSession: true, maxSessions: 2 });
    });

    it('should evict the least recently used session', async () => {
      const deviceA = await login();
      const deviceB = await login();
      // A is used again: the register session and B are now older.
      const { body: rotatedA } = await refresh(deviceA.refreshToken);
      const deviceC = await login();

      expect((await refresh(deviceB.refreshToken)).status).toBe(401);
      expect((await refresh(rotatedA.refreshToken)).status).toBe(200);
      expect((await refresh(deviceC.refreshToken)).status).toBe(200);
      expect(Object.keys(await storedSessions())).toHaveLength(2);
    });
  });

  describe('with revokeSessionOnReuse: true', () => {
    beforeEach(async () => {
      await initApp({ multiSession: true, revokeSessionOnReuse: true });
    });

    it('should revoke only the session whose superseded token is replayed', async () => {
      const deviceA = await login();
      const deviceB = await login();
      const { body: rotatedA } = await refresh(deviceA.refreshToken);

      expect((await refresh(deviceA.refreshToken)).status).toBe(401);

      expect((await refresh(rotatedA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });
  });

  describe('with multiSession: false (v6.0 behavior)', () => {
    beforeEach(async () => {
      await initApp({});
    });

    it('should keep a single session per user', async () => {
      const deviceA = await login();
      const deviceB = await login();

      expect(claimsOf(deviceA.refreshToken)).not.toHaveProperty('sid');
      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    it('should not expose POST /auth/logout-all', async () => {
      const deviceA = await login();

      const { status } = await server.post('/auth/logout-all', {}, { headers: { Authorization: `Bearer ${deviceA.refreshToken}` } });

      expect(status).toBe(503);
    });
  });
});
