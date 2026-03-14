import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { wait } from '../utils';
import { createBasicUserEntity, createUserWithRefreshTokenEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - POST /auth/refresh-token (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with refreshTokenField configured (full rotation + DB validation)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const User = createUserWithRefreshTokenEntity();
      app = await initModule({
        useAuth: {
          userEntity: User,
          jwt: {
            secret: 'test-secret',
            expiresIn: '2s',
            refreshTokenExpiresIn: '20s',
          },
          refreshToken: {
            refreshTokenField: 'refreshTokenHash',
          },
        },
      });
      jwtService = app.get<JwtService>(JwtService);

      await server.post('/auth/register', { email: 'rotate@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'rotate@test.co', password: 'test' });
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('should return { accessToken, refreshToken } with longer expiration', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

      expect(status).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });

      const decoded = jwtService.decode(body.refreshToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(accessToken) as { exp: number; iat: number };

      expect(decoded.exp - decoded.iat).toBeGreaterThan(accessDecoded.exp - accessDecoded.iat);
    });

    it('should rotate: new refreshToken is different from old one', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      const { body } = await server.post('/auth/refresh-token', {}, { headers });

      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject old refresh token after rotation (DB validation)', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      await server.post('/auth/refresh-token', {}, { headers });

      // Old token is invalidated in DB
      const { status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(401);
    });

    it('should reject refresh token if no stored hash (after logout)', async () => {
      const refreshHeaders = { Authorization: `Bearer ${refreshToken}` };
      await server.post('/auth/logout', {}, { headers: refreshHeaders });

      const { status } = await server.post('/auth/refresh-token', {}, { headers: refreshHeaders });
      expect(status).toBe(401);
    });

    it('should still issue a valid new access token after the original access token has expired', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };

      await wait(3000);

      // Original access token is expired
      const { status: expiredStatus } = await server.get('/auth/account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(expiredStatus).toBe(401);

      // But the refresh token is still valid
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(200);
      expect(body.accessToken).toBeDefined();
    }, 10000);
  });

  describe('without refreshTokenField (no DB validation, no rotation enforcement)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: createBasicUserEntity(),
          jwt: {
            secret: 'test-secret',
            expiresIn: '2s',
            refreshTokenExpiresIn: '10s',
          },
        },
      });
      jwtService = app.get<JwtService>(JwtService);

      await server.post('/auth/register', { email: 'fallback@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'fallback@test.co', password: 'test' });
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('should return { accessToken, refreshToken } with longer expiration', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

      expect(status).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });

      const decoded = jwtService.decode(body.refreshToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(accessToken) as { exp: number; iat: number };

      expect(decoded.exp - decoded.iat).toBeGreaterThan(accessDecoded.exp - accessDecoded.iat);
    });

    it('should allow reuse of old refresh token (no server-side invalidation)', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      await server.post('/auth/refresh-token', {}, { headers });

      // Without refreshTokenField, old token still works
      const { status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(200);
    });
  });

  describe('with custom refreshSecret', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await initModule({
        useAuth: {
          userEntity: createBasicUserEntity(),
          jwt: {
            secret: 'access-secret',
            expiresIn: '15m',
            refreshTokenExpiresIn: '7d',
            refreshSecret: 'refresh-secret',
          },
        },
      });

      await server.post('/auth/register', { email: 'custom@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'custom@test.co', password: 'test' });
      refreshToken = body.refreshToken;
    });

    it('should accept refresh token signed with refreshSecret', async () => {
      const headers = { Authorization: `Bearer ${refreshToken}` };
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

      expect(status).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    });

    it('should reject access token as refresh token (different secret)', async () => {
      await server.post('/auth/register', { email: 'custom2@test.co', password: 'test' });
      const { body: loginBody } = await server.post('/auth/login', { email: 'custom2@test.co', password: 'test' });
      const headers = { Authorization: `Bearer ${loginBody.accessToken}` };

      // accessToken is signed with 'access-secret', refresh endpoint expects 'refresh-secret'
      const { status } = await server.post('/auth/refresh-token', {}, { headers });
      expect(status).toBe(401);
    });
  });
});
