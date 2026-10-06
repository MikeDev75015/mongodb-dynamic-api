import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, CachePurgeConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for the `DELETE /<path>/cache` route generated for every cached entity.
 *
 * Without `cachePurge`, any authenticated user can purge any entity's cache. `cachePurge`
 * (global in `forRoot`, per entity in `controllerOptions`) restricts it with an
 * `authAbilityPredicate` or removes it with `false`, without disabling the cache itself.
 */
describe('DynamicApiModule forFeature - cache purge route protection (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'cache_purge_users' })
  class CachePurgeUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: 'user' })
    role: string;
  }

  @Schema({ collection: 'cache_purge_articles' })
  class CachePurgeArticleEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    title: string;
  }

  const isAdmin = (user: { role: string }) => user.role === 'admin';

  const registerAndLogin = async (email: string, role: string) => {
    await server.post('/auth/register', { email, password: 'password123', role });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });

    return accessToken as string;
  };

  const setup = async ({ global, feature }: {
    global?: CachePurgeConfig;
    feature?: CachePurgeConfig;
  }) => {
    await initApp(
      {
        entity: CachePurgeArticleEntity,
        // GetMany only: otherwise DELETE /cache-purge-articles/cache would fall through to
        // DeleteOne (`:id` = 'cache') once the purge route is removed.
        controllerOptions: {
          path: 'cache-purge-articles',
          cachePurge: feature,
          routesConfig: { defaults: ['GetMany'] },
        },
      },
      {
        cachePurge: global,
        useAuth: {
          userEntity: CachePurgeUserEntity,
          login: { loginField: 'email', passwordField: 'password', additionalFields: ['role'] },
          register: { additionalFields: [{ name: 'role', required: false }] },
        },
      },
    );
  };

  describe('without cachePurge (default)', () => {
    beforeEach(() => setup({}));

    it('lets any authenticated user purge the cache', async () => {
      const userToken = await registerAndLogin('member@cache-purge.co', 'user');

      const { status, body } = await server.delete('/cache-purge-articles/cache', { authToken: userToken });

      expect(status).toBe(200);
      expect(body).toEqual({ purged: true });
    });
  });

  describe('with a global authAbilityPredicate', () => {
    beforeEach(() => setup({ global: { authAbilityPredicate: isAdmin } }));

    it('returns 401 without a token', async () => {
      const { status } = await server.delete('/cache-purge-articles/cache');

      expect(status).toBe(401);
    });

    it('returns 403 for a user rejected by the predicate', async () => {
      const userToken = await registerAndLogin('member@cache-purge.co', 'user');

      const { status } = await server.delete('/cache-purge-articles/cache', { authToken: userToken });

      expect(status).toBe(403);
    });

    it('purges the cache for a user accepted by the predicate', async () => {
      const adminToken = await registerAndLogin('admin@cache-purge.co', 'admin');
      const articleModel = await getModelFromEntity(CachePurgeArticleEntity);
      await articleModel.insertMany([{ title: 'first' }]);

      const before = await server.get('/cache-purge-articles', { authToken: adminToken });
      await articleModel.insertMany([{ title: 'second' }]);
      const purge = await server.delete('/cache-purge-articles/cache', { authToken: adminToken });
      const after = await server.get('/cache-purge-articles', { authToken: adminToken });

      expect(before.body).toHaveLength(1);
      expect(purge.status).toBe(200);
      expect(after.body).toHaveLength(2);
    });
  });

  describe('with an entity predicate overriding the global one', () => {
    beforeEach(() => setup({
      global: { authAbilityPredicate: () => false },
      feature: { authAbilityPredicate: isAdmin },
    }));

    it('applies the entity predicate', async () => {
      const userToken = await registerAndLogin('member@cache-purge.co', 'user');
      const adminToken = await registerAndLogin('admin@cache-purge.co', 'admin');

      const denied = await server.delete('/cache-purge-articles/cache', { authToken: userToken });
      const allowed = await server.delete('/cache-purge-articles/cache', { authToken: adminToken });

      expect(denied.status).toBe(403);
      expect(allowed.status).toBe(200);
    });
  });

  describe.each([
    ['globally', { global: false as const }],
    ['for the entity', { feature: false as const }],
  ])('with cachePurge: false %s', (_, options) => {
    beforeEach(() => setup(options));

    it('removes the route but keeps caching responses', async () => {
      const adminToken = await registerAndLogin('admin@cache-purge.co', 'admin');
      const articleModel = await getModelFromEntity(CachePurgeArticleEntity);
      await articleModel.insertMany([{ title: 'first' }]);

      const purge = await server.delete('/cache-purge-articles/cache', { authToken: adminToken });
      const first = await server.get('/cache-purge-articles', { authToken: adminToken });
      await articleModel.insertMany([{ title: 'second' }]);
      const second = await server.get('/cache-purge-articles', { authToken: adminToken });

      expect(purge.status).toBe(404);
      expect(first.body).toHaveLength(1);
      expect(second.body).toHaveLength(1);
    });
  });
});
