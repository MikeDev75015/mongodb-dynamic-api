import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { DynamicApiHealthModule, DynamicApiModule } from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { createBasicUserEntity } from '../shared';

describe('DynamicApiHealthModule (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with the default path', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DynamicApiModule.forRoot(uri), DynamicApiHealthModule.register()],
      }).compile();

      await createTestingApp(moduleRef);
    });

    it('returns 200 { status: "ok", mongo: "up" } on GET /health', async () => {
      const { body, status } = await server.get('/health');

      expect(status).toBe(200);
      expect(body).toStrictEqual({ status: 'ok', mongo: 'up' });
    });
  });

  describe('with a custom path', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DynamicApiModule.forRoot(uri), DynamicApiHealthModule.register({ path: 'healthz' })],
      }).compile();

      await createTestingApp(moduleRef);
    });

    it('mounts the endpoint at the custom path instead of /health', async () => {
      const { status } = await server.get('/healthz');
      expect(status).toBe(200);

      const { status: defaultPathStatus } = await server.get('/health');
      expect(defaultPathStatus).toBe(404);
    });
  });

  describe('when the global JWT guard is active (useAuth configured)', () => {
    const UserEntity = createBasicUserEntity();

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          DynamicApiModule.forRoot(uri, { useAuth: { userEntity: UserEntity } }),
          DynamicApiHealthModule.register(),
        ],
      }).compile();

      await createTestingApp(moduleRef);
    });

    it('remains reachable without an access token — @Public() exempts it from the global guard', async () => {
      const { body, status } = await server.get('/health');

      expect(status).toBe(200);
      expect(body).toStrictEqual({ status: 'ok', mongo: 'up' });
    });

    it('still enforces auth on unrelated protected routes (sanity check)', async () => {
      const { status } = await server.get('/auth/account');
      expect(status).toBe(401);
    });
  });
});
