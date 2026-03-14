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

      const { accessToken } = await server.emit<any, any>(
        'auth-register',
        { email: 'ws-refresh@test.co', password: 'test' },
      );
      wsAccessToken = accessToken;
      handleSocketResponse.mockReset();
    });

    it('should return a refresh token with longer expiration than the access token', async () => {
      await server.emit('auth-refresh-token', undefined, { accessToken: wsAccessToken });

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledTimes(1);

      const [responseData] = handleSocketResponse.mock.calls[0];
      expect(responseData).toHaveProperty('accessToken');

      const refreshDecoded = jwtService.decode(responseData.accessToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(wsAccessToken) as { exp: number; iat: number };

      expect(refreshDecoded.exp - refreshDecoded.iat).toBeGreaterThan(accessDecoded.exp - accessDecoded.iat);
    });

    it('should still issue a valid refresh token after the access token has expired', async () => {
      // Get refresh token before access token expires
      await server.emit('auth-refresh-token', undefined, { accessToken: wsAccessToken });
      const [refreshResponseData] = handleSocketResponse.mock.calls[0];
      const refreshToken = refreshResponseData.accessToken;
      handleSocketResponse.mockReset();

      // Wait for the short-lived token to expire
      await wait(3000);

      // Original token is expired — auth-get-account should fail
      await server.emit('auth-get-account', undefined, { accessToken: wsAccessToken });
      expect(handleSocketException).toHaveBeenCalledWith({ message: 'Unauthorized' });
      handleSocketException.mockReset();

      // But the refresh token is still valid
      await server.emit('auth-get-account', undefined, { accessToken: refreshToken });
      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ws-refresh@test.co' }),
      );
    }, 10000);
  });

  describe('without jwt.refreshTokenExpiresIn (fallback)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let wsAccessToken: string;

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

      const { accessToken } = await server.emit<any, any>(
        'auth-register',
        { email: 'ws-fallback@test.co', password: 'test' },
      );
      wsAccessToken = accessToken;
      handleSocketResponse.mockReset();
    });

    it('should return a refresh token with same expiration as the access token', async () => {
      await server.emit('auth-refresh-token', undefined, { accessToken: wsAccessToken });

      const [responseData] = handleSocketResponse.mock.calls[0];
      expect(responseData).toHaveProperty('accessToken');

      const refreshDecoded = jwtService.decode(responseData.accessToken) as { exp: number; iat: number };
      const accessDecoded = jwtService.decode(wsAccessToken) as { exp: number; iat: number };

      expect(refreshDecoded.exp - refreshDecoded.iat).toBeCloseTo(accessDecoded.exp - accessDecoded.iat, -1);
    });
  });
});


