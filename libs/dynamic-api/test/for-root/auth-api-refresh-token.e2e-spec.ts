import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { wait } from '../utils';
import { createBasicUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - POST /auth/refresh-token with refreshTokenExpiresIn (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with jwt.refreshTokenExpiresIn configured', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let accessToken: string;

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

      await server.post('/auth/register', { email: 'refresh@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'refresh@test.co', password: 'test' });
      accessToken = body.accessToken;
    });

    it('should store jwtRefreshTokenExpiresIn in module state', () => {
      expect(DynamicApiModule.state.get('jwtRefreshTokenExpiresIn')).toBe('10s');
    });

    it('should return a refresh token with longer expiration than the access token', async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

      expect(status).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String) });

      const decoded = jwtService.decode(body.accessToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(accessToken) as { exp: number; iat: number };

      const refreshDuration = decoded.exp - decoded.iat;
      const accessDuration = accessDecoded.exp - accessDecoded.iat;

      expect(refreshDuration).toBeGreaterThan(accessDuration);
      expect(refreshDuration).toBeCloseTo(10, -1);
    });

    it('should still issue a valid refresh token after the access token has expired', async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      // Get refresh token before access token expires
      const { body: refreshBody } = await server.post('/auth/refresh-token', {}, { headers });
      const refreshToken = refreshBody.accessToken;

      // Wait for the short-lived access token to expire
      await wait(3000);

      // Original access token is expired
      const { status: expiredStatus } = await server.get('/auth/account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(expiredStatus).toBe(401);

      // But the refresh token is still valid (10s > 3s elapsed)
      const { body: accountBody, status: accountStatus } = await server.get('/auth/account', {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      expect(accountStatus).toBe(200);
      expect(accountBody).toEqual({ id: expect.any(String), email: 'refresh@test.co' });
    }, 10000);
  });

  describe('without jwt.refreshTokenExpiresIn (fallback)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let accessToken: string;

    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: createBasicUserEntity(),
          jwt: {
            secret: 'test-secret',
            expiresIn: '1h',
          },
        },
      });
      jwtService = app.get<JwtService>(JwtService);

      await server.post('/auth/register', { email: 'fallback@test.co', password: 'test' });
      const { body } = await server.post('/auth/login', { email: 'fallback@test.co', password: 'test' });
      accessToken = body.accessToken;
    });

    it('should return a refresh token with same expiration as the access token', async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

      expect(status).toBe(200);

      const refreshDecoded = jwtService.decode(body.accessToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(accessToken) as { exp: number; iat: number };

      const refreshDuration = refreshDecoded.exp - refreshDecoded.iat;
      const accessDuration = accessDecoded.exp - accessDecoded.iat;

      expect(refreshDuration).toBeCloseTo(accessDuration, -1);
    });
  });
});



