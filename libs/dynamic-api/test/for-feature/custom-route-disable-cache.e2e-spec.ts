import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiControllerOptions, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for `CustomRouteConfig.disableCache`.
 *
 * With the global cache on, every GET — custom routes included — is cached and only invalidated
 * by an HTTP write under the same controller path. A custom GET whose data is written from
 * elsewhere (raw `collection.updateOne`, another entity's route, a scheduled job) stayed frozen
 * on its first response, with no per-route way out: `disableCache` only existed on standard
 * routes, and the controller-level `disableCache` was ignored by custom routes.
 */
describe('DynamicApiModule forFeature - custom route disableCache (e2e)', () => {
  @Schema({ collection: 'custom_cache_lobbies' })
  class CachedLobbyEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    status: string;
  }

  const readStatuses: CustomRouteConfig<CachedLobbyEntity>['handler'] = async ({ model }) => {
    const lobbies = await model.find().sort({ name: 1 }).lean().exec();
    return { statuses: lobbies.map(({ status }) => status) };
  };

  const feedRoute = (
    path: string,
    disableCache?: boolean,
  ): CustomRouteConfig<CachedLobbyEntity> => ({ path, method: 'GET', handler: readStatuses, disableCache });

  const setupApp = async (
    controllerOptions: Partial<DynamicApiControllerOptions<CachedLobbyEntity>>,
    customRoutes: CustomRouteConfig<CachedLobbyEntity>[],
  ) => {
    await initApp(
      {
        entity: CachedLobbyEntity,
        controllerOptions: { path: 'cached-lobbies', isPublic: true, ...controllerOptions },
        routes: [{ type: 'GetOne' }],
        customRoutes,
      },
      {},
      async () => {
        const model = await getModelFromEntity(CachedLobbyEntity);
        await model.insertMany([{ name: 'lobby-1', status: 'open' }]);
      },
    );
  };

  /** A write the cache interceptor never sees: no HTTP route involved. */
  const rawUpdateStatus = async (status: string) => {
    const model = await getModelFromEntity(CachedLobbyEntity);
    await model.collection.updateOne({ name: 'lobby-1' }, { $set: { status } });
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('route-level disableCache', () => {
    beforeEach(async () => {
      await setupApp({}, [feedRoute('cached-feed'), feedRoute('live-feed', true)]);
    });

    it('re-reads the database after a raw write when disableCache is true', async () => {
      const first = await server.get('/cached-lobbies/live-feed');
      expect(first.body).toStrictEqual({ statuses: ['open'] });

      await rawUpdateStatus('joined');

      const second = await server.get('/cached-lobbies/live-feed');
      expect(second.status).toBe(200);
      expect(second.body).toStrictEqual({ statuses: ['joined'] });
    });

    it('keeps serving the cached response after a raw write without disableCache', async () => {
      const first = await server.get('/cached-lobbies/cached-feed');
      expect(first.body).toStrictEqual({ statuses: ['open'] });

      await rawUpdateStatus('joined');

      const second = await server.get('/cached-lobbies/cached-feed');
      expect(second.body).toStrictEqual({ statuses: ['open'] });
    });
  });

  describe('controller-level disableCache', () => {
    beforeEach(async () => {
      await setupApp({ disableCache: true }, [feedRoute('inherited-feed'), feedRoute('recached-feed', false)]);
    });

    it('is inherited by a custom route that does not set disableCache', async () => {
      await server.get('/cached-lobbies/inherited-feed');
      await rawUpdateStatus('joined');

      const { body } = await server.get('/cached-lobbies/inherited-feed');
      expect(body).toStrictEqual({ statuses: ['joined'] });
    });

    it('is overridden by disableCache: false on the custom route', async () => {
      await server.get('/cached-lobbies/recached-feed');
      await rawUpdateStatus('joined');

      const { body } = await server.get('/cached-lobbies/recached-feed');
      expect(body).toStrictEqual({ statuses: ['open'] });
    });
  });
});
