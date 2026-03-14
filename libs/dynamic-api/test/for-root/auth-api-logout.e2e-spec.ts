import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { createBasicUserEntity, createUserWithRefreshTokenEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - POST /auth/logout (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('Bearer mode (useCookie: false) with refreshTokenField', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const User = createUserWithRefreshTokenEntity();
      await initModule({
        useAuth: {
          userEntity: User,
          jwt: { secret: 'secret', expiresIn: '15m', refreshTokenExpiresIn: '7d' },
          refreshToken: { refreshTokenField: 'refreshTokenHash' },
        },
      });

      await server.post('/auth/register', { email: 'logout@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'logout@test.co', password: 'test' });
      refreshToken = body.refreshToken;
    });

    it('should return 204 on logout', async () => {
      const { status } = await server.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      expect(status).toBe(204);
    });

    it('should invalidate the refresh token after logout', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      await server.post('/auth/logout', {}, { headers });

      const { status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(401);
    });

    it('should return 401 on logout without refresh token', async () => {
      const { status } = await server.post('/auth/logout', {});
      expect(status).toBe(401);
    });
  });

  describe('Bearer mode without refreshTokenField (warning only)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await initModule({
        useAuth: {
          userEntity: createBasicUserEntity(),
          jwt: { secret: 'secret', expiresIn: '15m', refreshTokenExpiresIn: '7d' },
        },
      });

      await server.post('/auth/register', { email: 'logout-nowarn@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'logout-nowarn@test.co', password: 'test' });
      refreshToken = body.refreshToken;
    });

    it('should return 204 even without refreshTokenField (logs warning)', async () => {
      const { status } = await server.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      expect(status).toBe(204);
    });

    it('should still allow refresh after logout (no server-side revocation)', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      await server.post('/auth/logout', {}, { headers });

      // Without refreshTokenField, server cannot revoke the token
      const { status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(200);
    });
  });
});

