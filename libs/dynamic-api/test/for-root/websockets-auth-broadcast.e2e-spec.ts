import { INestApplication } from '@nestjs/common';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import { closeTestingApp, handleSocketBroadcast, server } from '../e2e.setup';
import 'dotenv/config';
import { createBroadcastUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Websockets useAuth with broadcast options (e2e)', () => {
  const UserEntity = createBroadcastUserEntity();

  let wsAccessToken: string;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  beforeEach(async () => {
    await initModule({
      useAuth: {
        userEntity: UserEntity,
        login: {
          loginField: 'email',
          passwordField: 'password',
          broadcast: { enabled: true, fields: ['id', 'email'] },
        },
        register: {
          broadcast: { enabled: true, fields: ['id', 'email'] },
        },
        getAccount: {
          broadcast: { enabled: true, fields: ['id', 'email'] },
        },
        updateAccount: {
          broadcast: { enabled: true, fields: ['id', 'email'] },
        },
      },
      webSocket: true,
    },
    undefined,
    async (app: INestApplication) => {
      app.useWebSocketAdapter(new SocketAdapter(app));
    },
    );

    const { accessToken } = await server.emit<any, any>('auth-register', { email: 'broadcast-ws@test.co', password: 'ws-pass' });
    wsAccessToken = accessToken;
    jest.clearAllMocks();
  });

  it('[auth-login] should broadcast user data when login via WS with enabled broadcast', async () => {
    await server.emit(
      'auth-login',
      { email: 'broadcast-ws@test.co', password: 'ws-pass' },
      { expectBroadcast: true, broadcastEvent: 'auth-login-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth-login-broadcast',
        data: expect.arrayContaining([
          expect.objectContaining({ email: 'broadcast-ws@test.co' }),
        ]),
      }),
    );
  });

  it('[auth-register] should broadcast user data when register via WS with enabled broadcast', async () => {
    await server.emit(
      'auth-register',
      { email: 'broadcast-ws2@test.co', password: 'ws-pass2' },
      { expectBroadcast: true, broadcastEvent: 'auth-register-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth-register-broadcast',
        data: expect.arrayContaining([
          expect.objectContaining({ email: 'broadcast-ws2@test.co' }),
        ]),
      }),
    );
  });

  it('[auth-get-account] should broadcast account data when get account via WS with enabled broadcast', async () => {
    await server.emit(
      'auth-get-account',
      {},
      { accessToken: wsAccessToken, expectBroadcast: true, broadcastEvent: 'auth-get-account-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth-get-account-broadcast',
        data: expect.arrayContaining([
          expect.objectContaining({ email: 'broadcast-ws@test.co' }),
        ]),
      }),
    );
  });

  it('[auth-update-account] should broadcast updated account data when update account via WS with enabled broadcast', async () => {
    await server.emit(
      'auth-update-account',
      { name: 'WS Broadcast User' },
      { accessToken: wsAccessToken, expectBroadcast: true, broadcastEvent: 'auth-update-account-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth-update-account-broadcast',
        data: expect.arrayContaining([
          expect.objectContaining({ email: 'broadcast-ws@test.co' }),
        ]),
      }),
    );
  });
});

