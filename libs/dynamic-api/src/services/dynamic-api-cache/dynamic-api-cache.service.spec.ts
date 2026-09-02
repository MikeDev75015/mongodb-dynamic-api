import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicApiCachePathRegistryStore } from '../../helpers/cache-path-registry.store';
import { DynamicApiCacheService } from './dynamic-api-cache.service';

class ProductEntity {}
Object.defineProperty(ProductEntity, 'name', { value: 'ProductEntity', writable: false });

class OrderEntity {}
Object.defineProperty(OrderEntity, 'name', { value: 'OrderEntity', writable: false });

function fakeIterableStore(entries: [string, unknown][]) {
  return {
    // eslint-disable-next-line @typescript-eslint/require-await
    iterator: async function* () {
      for (const entry of entries) {
        yield entry;
      }
    },
  };
}

describe('DynamicApiCacheService', () => {
  let cacheManager: { stores: any[]; del: Mock; clear: Mock };
  let service: DynamicApiCacheService;

  beforeEach(() => {
    DynamicApiCachePathRegistryStore.reset();
    DynamicApiCachePathRegistryStore.register('ProductEntity', 'products');
    DynamicApiCachePathRegistryStore.register('OrderEntity', 'orders');

    cacheManager = {
      stores: [
        fakeIterableStore([
          ['/products', ['a']],
          ['/products/1', { id: 1 }],
          ['/products/1::user-1', { id: 1, secret: true }],
          ['/products-extra', ['unrelated but shares the string prefix']],
          ['/orders', ['x']],
        ]),
      ],
      del: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true),
    };

    service = new DynamicApiCacheService(cacheManager as any);
  });

  describe('invalidate', () => {
    it('should delete every cache entry scoped to the entity\'s registered path', async () => {
      await service.invalidate(ProductEntity);

      expect(cacheManager.del).toHaveBeenCalledWith('/products');
      expect(cacheManager.del).toHaveBeenCalledWith('/products/1');
      expect(cacheManager.del).toHaveBeenCalledWith('/products/1::user-1');
      expect(cacheManager.del).not.toHaveBeenCalledWith('/products-extra');
      expect(cacheManager.del).not.toHaveBeenCalledWith('/orders');
      expect(cacheManager.clear).not.toHaveBeenCalled();
    });

    it('should ignore the optional id parameter (accepted for call-site clarity only)', async () => {
      await service.invalidate(ProductEntity, 'some-id');

      expect(cacheManager.del).toHaveBeenCalledWith('/products/1');
    });

    it('should fall back to a full clear() when the entity has no registered path', async () => {
      class UnregisteredEntity {}
      Object.defineProperty(UnregisteredEntity, 'name', { value: 'UnregisteredEntity', writable: false });

      await service.invalidate(UnregisteredEntity);

      expect(cacheManager.clear).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should call cacheManager.clear()', async () => {
      await service.clear();

      expect(cacheManager.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateForUrl', () => {
    it('should invalidate only the matching entity\'s cache for a write URL', async () => {
      await service.invalidateForUrl('/orders/5');

      expect(cacheManager.del).toHaveBeenCalledWith('/orders');
      expect(cacheManager.del).not.toHaveBeenCalledWith('/products');
      expect(cacheManager.clear).not.toHaveBeenCalled();
    });

    it('should fall back to a full clear() when no registered entity matches the URL', async () => {
      await service.invalidateForUrl('/health');

      expect(cacheManager.clear).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('store enumeration fallback', () => {
    it('should fall back to a full clear() when no configured store supports iteration', async () => {
      cacheManager.stores = [{ /* no iterator */ }];

      await service.invalidate(ProductEntity);

      expect(cacheManager.clear).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should scan every iterable store and skip non-iterable ones', async () => {
      cacheManager.stores = [
        { /* no iterator */ },
        fakeIterableStore([['/products/2', { id: 2 }]]),
      ];

      await service.invalidate(ProductEntity);

      expect(cacheManager.del).toHaveBeenCalledWith('/products/2');
      expect(cacheManager.clear).not.toHaveBeenCalled();
    });
  });
});
