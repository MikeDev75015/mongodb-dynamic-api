import mongoose from 'mongoose';
import { DynamicApiModule, getAuthOperationContext } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { createBroadcastUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - PATCH /auth/account (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Default behaviour — refreshTokenOnUpdate: false (not set)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('default behaviour (refreshTokenOnUpdate not set)', () => {
    const UserEntity = createBroadcastUserEntity();
    let accessToken: string;

    beforeEach(async () => {
      await initModule({ useAuth: { userEntity: UserEntity } });
      const { body } = await server.post('/auth/register', { email: 'update@test.co', password: 'pass' });
      accessToken = body.accessToken;
    });

    it('should return 401 when access token is missing', async () => {
      const { body, status } = await server.patch('/auth/account', { name: 'New Name' });

      expect(status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized', statusCode: 401 });
    });

    it('should return the updated entity (not a token pair)', async () => {
      const { body, status } = await server.patch('/auth/account', { name: 'New Name' }, { authToken: accessToken });

      expect(status).toBe(200);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email', 'update@test.co');
      expect(body).not.toHaveProperty('accessToken');
      expect(body).not.toHaveProperty('refreshToken');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // refreshTokenOnUpdate: true — should return a fresh token pair
  // ─────────────────────────────────────────────────────────────────────────────
  describe('refreshTokenOnUpdate: true', () => {
    const UserEntity = createBroadcastUserEntity();
    let firstAccessToken: string;

    beforeEach(async () => {
      await initModule({
        useAuth: {
          userEntity: UserEntity,
          updateAccount: { refreshTokenOnUpdate: true },
        },
      });
      const { body } = await server.post('/auth/register', { email: 'refresh@test.co', password: 'pass' });
      firstAccessToken = body.accessToken;
    });

    it('should return 401 when access token is missing', async () => {
      const { body, status } = await server.patch('/auth/account', { name: 'X' });

      expect(status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized', statusCode: 401 });
    });

    it('should return a fresh token pair instead of the entity', async () => {
      const { body, status } = await server.patch(
        '/auth/account',
        { name: 'Updated Name' },
        { authToken: firstAccessToken },
      );

      expect(status).toBe(200);
      expect(body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('new accessToken should be usable to fetch account', async () => {
      const { body: tokenPair } = await server.patch(
        '/auth/account',
        { name: 'Updated Name' },
        { authToken: firstAccessToken },
      );

      const { body: account, status } = await server.get('/auth/account', { authToken: tokenPair.accessToken });

      expect(status).toBe(200);
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('email', 'refresh@test.co');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAuthOperationContext — AsyncLocalStorage propagation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getAuthOperationContext', () => {
    it('should expose "updateAccount" context inside updateAccount callback', async () => {
      let capturedContext: string | undefined;
      const UserEntity = createBroadcastUserEntity();

      await initModule({
        useAuth: {
          userEntity: UserEntity,
          updateAccount: {
            callback: async () => {
              capturedContext = getAuthOperationContext();
            },
          },
        },
      });

      const { body: { accessToken } } = await server.post('/auth/register', {
        email: 'ctx-update@test.co',
        password: 'pass',
      });
      await server.patch('/auth/account', { name: 'Ctx Test' }, { authToken: accessToken });

      expect(capturedContext).toBe('updateAccount');
    });

    it('should expose "login" context inside login callback', async () => {
      let capturedContext: string | undefined;
      const UserEntity = createBroadcastUserEntity();

      await initModule({
        useAuth: {
          userEntity: UserEntity,
          login: {
            callback: async () => {
              capturedContext = getAuthOperationContext();
            },
          },
        },
      });

      await server.post('/auth/register', { email: 'ctx-login@test.co', password: 'pass' });
      await server.post('/auth/login', { email: 'ctx-login@test.co', password: 'pass' });

      expect(capturedContext).toBe('login');
    });

    it('should expose "register" context inside register callback', async () => {
      let capturedContext: string | undefined;
      const UserEntity = createBroadcastUserEntity();

      await initModule({
        useAuth: {
          userEntity: UserEntity,
          register: {
            callback: async () => {
              capturedContext = getAuthOperationContext();
            },
          },
        },
      });

      await server.post('/auth/register', { email: 'ctx-register@test.co', password: 'pass' });

      expect(capturedContext).toBe('register');
    });

    it('should return undefined when called outside an auth operation', () => {
      expect(getAuthOperationContext()).toBeUndefined();
    });
  });
});



