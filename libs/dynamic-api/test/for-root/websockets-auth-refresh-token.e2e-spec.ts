import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import {
  closeTestingApp,
  handleSocketException,
  handleSocketResponse,
  server,
} from '../e2e.setup';
import 'dotenv/config';
import { wait } from '../utils';
import { createBasicUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Websockets EVENT auth-refresh-token with refreshTokenExpiresIn (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with jwt.refreshTokenExpiresIn configured', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let wsAccessToken: string;
    let wsRefreshToken: string;

    beforeEach(async () => {
      app = await initModule(
        {
          useAuth: {
            userEntity: createBasicUserEntity(),
            webSocket: true,
            jwt: {
              secret: 'test-secret',
              expiresIn: '2s',
              refreshTokenExpiresIn: '10s',
            },
          },
        },
        undefined,
        async (_: INestApplication) => {
          _.useWebSocketAdapter(new SocketAdapter(_));
        },
      );
      jwtService = app.get<JwtService>(JwtService);

      const { accessToken, refreshToken } = await server.emit<any, any>(
        'auth-register',
        { email: 'ws-refresh@test.co', password: 'test' },
      );
      wsAccessToken = accessToken;
      wsRefreshToken = refreshToken;
      handleSocketResponse.mockReset();
    });

    it('should return { accessToken, refreshToken } with refresh token having longer expiration', async () => {
      await server.emit('auth-refresh-token', undefined, { refreshToken: wsRefreshToken });

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledTimes(1);

      const [responseData] = handleSocketResponse.mock.calls[0];
      expect(responseData).toHaveProperty('accessToken');
      expect(responseData).toHaveProperty('refreshToken');

      const newRefreshDecoded = jwtService.decode(responseData.refreshToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(wsAccessToken) as { exp: number; iat: number };

      expect(newRefreshDecoded.exp - newRefreshDecoded.iat).toBeGreaterThan(accessDecoded.exp - accessDecoded.iat);
    });

    it('should still issue a valid new access token after the original access token has expired', async () => {
      // Wait for the short-lived access token to expire
      await wait(3000);

      // Original access token is expired — auth-get-account should fail
      await server.emit('auth-get-account', undefined, { accessToken: wsAccessToken });
      expect(handleSocketException).toHaveBeenCalledWith({ message: 'Unauthorized' });
      handleSocketException.mockReset();
      handleSocketResponse.mockReset();

      // But the refresh token (10s) is still valid — get a new access token
      await server.emit('auth-refresh-token', undefined, { refreshToken: wsRefreshToken });
      expect(handleSocketException).not.toHaveBeenCalled();
      const [refreshData] = handleSocketResponse.mock.calls[0];
      const newAccessToken = refreshData.accessToken;
      handleSocketResponse.mockReset();

      // New access token works for auth-get-account
      await server.emit('auth-get-account', undefined, { accessToken: newAccessToken });
      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ws-refresh@test.co' }),
      );
    }, 10000);
  });

  describe('without jwt.refreshTokenExpiresIn (defaults to 7d)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let wsAccessToken: string;
    let wsRefreshToken: string;

    beforeEach(async () => {
      app = await initModule(
        {
          useAuth: {
            userEntity: createBasicUserEntity(),
            webSocket: true,
            jwt: {
              secret: 'test-secret',
              expiresIn: '1h',
            },
          },
        },
        undefined,
        async (_: INestApplication) => {
          _.useWebSocketAdapter(new SocketAdapter(_));
        },
      );
      jwtService = app.get<JwtService>(JwtService);

      const { accessToken, refreshToken } = await server.emit<any, any>(
        'auth-register',
        { email: 'ws-fallback@test.co', password: 'test' },
      );
      wsAccessToken = accessToken;
      wsRefreshToken = refreshToken;
      handleSocketResponse.mockReset();
    });

    it('should return a refresh token with longer expiration than the access token (defaults to 7d)', async () => {
      await server.emit('auth-refresh-token', undefined, { refreshToken: wsRefreshToken });

      const [responseData] = handleSocketResponse.mock.calls[0];
      expect(responseData).toHaveProperty('refreshToken');

      const newRefreshDecoded = jwtService.decode(responseData.refreshToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(wsAccessToken) as { exp: number; iat: number };

      // 7d (604800s) >> 1h (3600s)
      expect(newRefreshDecoded.exp - newRefreshDecoded.iat).toBeGreaterThan(accessDecoded.exp - accessDecoded.iat);
    });
  });
});

