import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import { closeTestingApp, handleSocketException, server } from '../e2e.setup';
import 'dotenv/config';
import { createUserWithRefreshTokenEntity, initModule } from '../shared';

type TokenPair = { accessToken: string; refreshToken: string };
type SocketException = { message?: string };

describe('DynamicApiModule forRoot - Websockets refreshToken.multiSession (e2e)', () => {
  const email = 'ws-multi@test.co';
  const password = 'test';

  let app: INestApplication;

  const socketLogin = () => server.emit<object, TokenPair>('auth-login', { email, password });
  const httpLogin = async (): Promise<TokenPair> => (await server.post('/auth/login', { email, password })).body;
  const socketRefresh = (refreshToken: string) =>
    server.emit<undefined, TokenPair & SocketException>('auth-refresh-token', undefined, { refreshToken });
  const httpRefreshStatus = async (refreshToken: string): Promise<number> =>
    (await server.post('/auth/refresh-token', {}, { headers: { Authorization: `Bearer ${refreshToken}` } })).status;

  const initApp = async (multiSession: boolean) => {
    app = await initModule(
      {
        useAuth: {
          userEntity: createUserWithRefreshTokenEntity(),
          webSocket: true,
          refreshToken: { refreshTokenField: 'refreshTokenHash', multiSession },
        },
      },
      undefined,
      async (_: INestApplication) => {
        _.useWebSocketAdapter(new SocketAdapter(_));
      },
    );
    await server.post('/auth/register', { email, password });
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with multiSession: true', () => {
    beforeEach(async () => {
      await initApp(true);
    });

    it('should keep the socket session alive after another device logs in over HTTP', async () => {
      const socketDevice = await socketLogin();
      const httpDevice = await httpLogin();

      const rotated = await socketRefresh(socketDevice.refreshToken);

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(rotated).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      const jwt = new JwtService();
      expect((jwt.decode(rotated.refreshToken) as { sid: string }).sid)
      .toBe((jwt.decode(socketDevice.refreshToken) as { sid: string }).sid);
      expect(await httpRefreshStatus(httpDevice.refreshToken)).toBe(200);
    });

    it('should only log out the socket session on auth-logout', async () => {
      const socketDevice = await socketLogin();
      const httpDevice = await httpLogin();

      await server.emit('auth-logout', undefined, { refreshToken: socketDevice.refreshToken });

      expect(await httpRefreshStatus(socketDevice.refreshToken)).toBe(401);
      expect(await httpRefreshStatus(httpDevice.refreshToken)).toBe(200);
    });

    it('should log out every device on auth-logout-all', async () => {
      const socketDevice = await socketLogin();
      const httpDevice = await httpLogin();

      const response = await server.emit('auth-logout-all', undefined, { refreshToken: socketDevice.refreshToken });

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(await httpRefreshStatus(socketDevice.refreshToken)).toBe(401);
      expect(await httpRefreshStatus(httpDevice.refreshToken)).toBe(401);
    });

    it('should reject a socket refresh of a logged-out session', async () => {
      const socketDevice = await socketLogin();
      await server.emit('auth-logout', undefined, { refreshToken: socketDevice.refreshToken });

      await socketRefresh(socketDevice.refreshToken);

      expect(handleSocketException).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid refresh token' }));
    });
  });

  describe('with multiSession: false', () => {
    beforeEach(async () => {
      await initApp(false);
    });

    it('should refuse auth-logout-all', async () => {
      const socketDevice = await socketLogin();

      await server.emit('auth-logout-all', undefined, { refreshToken: socketDevice.refreshToken });

      expect(handleSocketException).toHaveBeenCalledWith(expect.objectContaining({ message: 'This feature is not available' }));
      expect(await httpRefreshStatus(socketDevice.refreshToken)).toBe(200);
    });
  });
});
