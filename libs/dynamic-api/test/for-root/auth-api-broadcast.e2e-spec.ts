import { INestApplication } from '@nestjs/common';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, handleSocketBroadcast, server, TestSocketAdapter } from '../e2e.setup';
import 'dotenv/config';
import { createBroadcastUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - useAuth with broadcast options (e2e)', () => {
  const UserEntity = createBroadcastUserEntity();

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
          broadcast: { enabled: true },
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
    },
    undefined,
    async (app: INestApplication) => {
      app.useWebSocketAdapter(new TestSocketAdapter(app));
    },
    );
    jest.clearAllMocks();
  });

  it('[login] should broadcast user data via HTTP after login', async () => {
    await server.post('/auth/register', { email: 'broadcast@test.co', password: 'pass' });

    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      '/auth/login',
      { email: 'broadcast@test.co', password: 'pass' },
      { broadcastEvent: 'auth-login-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'broadcast@test.co' }),
      ]),
    );
  });

  it('[register] should broadcast user data via HTTP after register', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      '/auth/register',
      { email: 'broadcast2@test.co', password: 'pass2' },
      { broadcastEvent: 'auth-register-broadcast' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'broadcast2@test.co' }),
      ]),
    );
  });

  it('[getAccount] should broadcast account via HTTP after GET /auth/account', async () => {
    await server.post('/auth/register', { email: 'broadcast3@test.co', password: 'pass3' });
    const { body: { accessToken } } = await server.post('/auth/login', { email: 'broadcast3@test.co', password: 'pass3' });

    jest.clearAllMocks();

    const { broadcastData } = await server.httpWithBroadcast(
      'get',
      '/auth/account',
      undefined,
      {
        authToken: accessToken,
        broadcastEvent: 'auth-get-account-broadcast',
      },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'broadcast3@test.co' }),
      ]),
    );
  });

  it('[updateAccount] should broadcast updated account via HTTP after PATCH /auth/account', async () => {
    await server.post('/auth/register', { email: 'broadcast4@test.co', password: 'pass4' });
    const { body: { accessToken } } = await server.post('/auth/login', { email: 'broadcast4@test.co', password: 'pass4' });

    jest.clearAllMocks();

    const { broadcastData } = await server.httpWithBroadcast(
      'patch',
      '/auth/account',
      { name: 'Broadcast User' },
      {
        authToken: accessToken,
        broadcastEvent: 'auth-update-account-broadcast',
      },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'broadcast4@test.co' }),
      ]),
    );
  });
});

