import { INestApplication } from '@nestjs/common';
import mongoose from 'mongoose';
import { DynamicApiModule, mintTokenPair } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { createBasicUserEntity, createUserWithRefreshTokenEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - mintTokenPair (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('without refreshTokenField configured', () => {
    const UserEntity = createBasicUserEntity();
    let app: INestApplication;

    beforeEach(async () => {
      app = await initModule({ useAuth: { userEntity: UserEntity } });
    });

    it('mints an access token that authenticates against /auth/account, exactly like /auth/login', async () => {
      await server.post('/auth/register', { email: 'oauth@test.co', password: 'test' });
      const { body: loginBody } = await server.post('/auth/login', { email: 'oauth@test.co', password: 'test' });
      const { body: account } = await server.get(
        '/auth/account',
        { headers: { Authorization: `Bearer ${loginBody.accessToken}` } },
      );

      // Simulates an OAuth/SSO callback minting tokens for an already-known user,
      // bypassing POST /auth/login entirely.
      const minted = await mintTokenPair(UserEntity, { id: account.id, email: account.email } as InstanceType<typeof UserEntity>);

      expect(minted).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });

      const { body, status } = await server.get(
        '/auth/account',
        { headers: { Authorization: `Bearer ${minted.accessToken}` } },
      );

      expect(status).toBe(200);
      expect(body).toEqual({ id: account.id, email: 'oauth@test.co' });
    });

    it('throws when useAuth is not configured', async () => {
      DynamicApiModule.state['resetState']();

      await expect(
        mintTokenPair(UserEntity, { id: 'x', email: 'x@test.co' } as InstanceType<typeof UserEntity>),
      ).rejects.toThrow('useAuth is not configured in DynamicApiModule.forRoot()');
    });
  });

  describe('with refreshTokenField configured', () => {
    const UserEntity = createUserWithRefreshTokenEntity();
    let app: INestApplication;

    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: UserEntity,
          refreshToken: { refreshTokenField: 'refreshTokenHash' },
        },
      });
    });

    it('mints a refresh token that works with POST /auth/refresh-token, exactly like /auth/login', async () => {
      await server.post('/auth/register', { email: 'oauth-rt@test.co', password: 'test' });
      const { body: loginBody } = await server.post(
        '/auth/login',
        { email: 'oauth-rt@test.co', password: 'test' },
      );
      const { body: account } = await server.get(
        '/auth/account',
        { headers: { Authorization: `Bearer ${loginBody.accessToken}` } },
      );

      const minted = await mintTokenPair(UserEntity, { id: account.id, email: account.email } as InstanceType<typeof UserEntity>);

      const { body, status } = await server.post(
        '/auth/refresh-token',
        {},
        { headers: { Authorization: `Bearer ${minted.refreshToken}` } },
      );

      expect(status).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    });
  });
});
