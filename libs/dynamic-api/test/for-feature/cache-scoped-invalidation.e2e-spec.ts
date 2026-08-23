import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiCacheService, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for audit findings F3 (invalidation was all-or-nothing) and F4 (a write outside
 * the HTTP cycle never invalidated anything).
 *
 * F3 — a write to one entity's routes must invalidate only that entity's cached responses, never
 * another entity's.
 * F4 — DynamicApiCacheService is a real, globally injectable provider (no CACHE_MANAGER token
 * workaround needed); calling `.invalidate(Entity)` after a raw, outside-HTTP write correctly
 * refreshes that entity's cached responses.
 */
describe('DynamicApiModule forFeature - scoped cache invalidation (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'cache_scope_products' })
  class CacheScopeProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  @Schema({ collection: 'cache_scope_orders' })
  class CacheScopeOrderEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    label: string;
  }

  describe('F3 — write to one entity never invalidates another entity\'s cache', () => {
    beforeEach(async () => {
      await initApp({
        entity: CacheScopeProductEntity,
        controllerOptions: { path: 'cache-scope-products', isPublic: true },
        routes: [
          { type: 'GetMany' },
          { type: 'CreateOne' },
        ],
        extraImports: [
          DynamicApiModule.forFeature({
            entity: CacheScopeOrderEntity,
            controllerOptions: { path: 'cache-scope-orders', isPublic: true },
            routes: [{ type: 'GetMany' }],
          }),
        ],
      });
    });

    it('should refresh the written entity\'s cache while leaving another entity\'s cache untouched', async () => {
      const productModel = await getModelFromEntity(CacheScopeProductEntity);
      const orderModel = await getModelFromEntity(CacheScopeOrderEntity);
      await productModel.insertMany([{ name: 'product-1' }]);
      await orderModel.insertMany([{ label: 'order-1' }]);

      // Populate both entities' caches.
      const productsFirst = await server.get('/cache-scope-products');
      const ordersFirst = await server.get('/cache-scope-orders');
      expect(productsFirst.body).toHaveLength(1);
      expect(ordersFirst.body).toHaveLength(1);

      // Insert a second order directly (bypassing HTTP) so its cache — if it were touched by the
      // upcoming product write — would visibly change.
      await orderModel.insertMany([{ label: 'order-2' }]);

      // Write to products via HTTP — should invalidate only products' cache.
      const created = await server.post('/cache-scope-products', { name: 'product-2' });
      expect(created.status).toBe(201);

      const productsSecond = await server.get('/cache-scope-products');
      const ordersSecond = await server.get('/cache-scope-orders');

      // Products' cache was invalidated by the write — fresh data, includes product-2.
      expect(productsSecond.body).toHaveLength(2);
      // Orders' cache was NOT touched by the products write — still the stale cached response
      // from before order-2 was inserted directly.
      expect(ordersSecond.body).toHaveLength(1);
    });
  });

  describe('F3 — the manual DELETE .../cache purge endpoint is scoped too', () => {
    beforeEach(async () => {
      await initApp({
        entity: CacheScopeProductEntity,
        controllerOptions: { path: 'cache-scope-products', isPublic: true },
        routes: [{ type: 'GetMany' }],
        extraImports: [
          DynamicApiModule.forFeature({
            entity: CacheScopeOrderEntity,
            controllerOptions: { path: 'cache-scope-orders', isPublic: true },
            routes: [{ type: 'GetMany' }],
          }),
        ],
      });
    });

    it('should purge only the requested entity\'s cache, not every entity\'s', async () => {
      const productModel = await getModelFromEntity(CacheScopeProductEntity);
      const orderModel = await getModelFromEntity(CacheScopeOrderEntity);
      await productModel.insertMany([{ name: 'product-1' }]);
      await orderModel.insertMany([{ label: 'order-1' }]);

      await server.get('/cache-scope-products');
      await server.get('/cache-scope-orders');

      await orderModel.insertMany([{ label: 'order-2' }]);
      await productModel.insertMany([{ name: 'product-2' }]);

      const purge = await server.delete('/cache-scope-products/cache');
      expect(purge.status).toBe(200);
      expect(purge.body).toEqual({ purged: true });

      const productsAfterPurge = await server.get('/cache-scope-products');
      const ordersAfterPurge = await server.get('/cache-scope-orders');

      expect(productsAfterPurge.body).toHaveLength(2); // purged — fresh data
      expect(ordersAfterPurge.body).toHaveLength(1); // untouched — still the stale cached response
    });
  });

  describe('F4 — DynamicApiCacheService invalidates a raw, outside-HTTP write', () => {
    beforeEach(async () => {
      await initApp({
        entity: CacheScopeProductEntity,
        controllerOptions: { path: 'cache-scope-products', isPublic: true },
        routes: [{ type: 'GetMany' }],
      });
    });

    it('should leave the cache stale after a raw write, then refresh it once DynamicApiCacheService.invalidate is called', async () => {
      const model = await getModelFromEntity(CacheScopeProductEntity);
      await model.insertMany([{ name: 'seed' }]);

      const first = await server.get('/cache-scope-products');
      expect(first.body).toHaveLength(1);

      // A write outside the HTTP cycle — nothing here goes through DynamicApiCacheInterceptor.
      await model.insertMany([{ name: 'added-by-cron' }]);

      const stillCached = await server.get('/cache-scope-products');
      expect(stillCached.body).toHaveLength(1); // proves the raw write alone didn't invalidate anything

      // Exactly what a cron job / queue consumer would do: inject DynamicApiCacheService (a real,
      // globally available provider — no CACHE_MANAGER token workaround) and invalidate explicitly.
      const cacheService = (global.app as INestApplication).get(DynamicApiCacheService);
      await cacheService.invalidate(CacheScopeProductEntity);

      const fresh = await server.get('/cache-scope-products');
      expect(fresh.body).toHaveLength(2);
    });
  });
});
