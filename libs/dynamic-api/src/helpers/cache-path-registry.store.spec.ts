import { beforeEach, describe, expect, it } from 'vitest';
import { DynamicApiCachePathRegistryStore } from './cache-path-registry.store';

describe('DynamicApiCachePathRegistryStore', () => {
  beforeEach(() => {
    DynamicApiCachePathRegistryStore.reset();
  });

  describe('register / getPath / getAll', () => {
    it('should register an entity path and read it back', () => {
      DynamicApiCachePathRegistryStore.register('Product', 'products');

      expect(DynamicApiCachePathRegistryStore.getPath('Product')).toBe('products');
      expect(DynamicApiCachePathRegistryStore.getAll()).toEqual([{ entityName: 'Product', path: 'products' }]);
    });

    it('should return undefined for an entity that was never registered', () => {
      expect(DynamicApiCachePathRegistryStore.getPath('Unknown')).toBeUndefined();
    });

    it('should overwrite the path on re-registration of the same entity', () => {
      DynamicApiCachePathRegistryStore.register('Product', 'products-v1');
      DynamicApiCachePathRegistryStore.register('Product', 'products-v2');

      expect(DynamicApiCachePathRegistryStore.getPath('Product')).toBe('products-v2');
      expect(DynamicApiCachePathRegistryStore.getAll()).toHaveLength(1);
    });
  });

  describe('findPrefixForUrl', () => {
    beforeEach(() => {
      DynamicApiCachePathRegistryStore.register('Product', 'products');
      DynamicApiCachePathRegistryStore.register('Order', 'orders');
    });

    it('should match the GetMany URL exactly', () => {
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/products')).toBe('/products');
    });

    it('should match a GetOne-style URL and return the entity-level prefix', () => {
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/products/64f0000000000000000000a1')).toBe('/products');
    });

    it('should match under a global prefix and/or version segment', () => {
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/api/v1/products/123')).toBe('/api/v1/products');
    });

    it('should match a query string by only considering the pathname', () => {
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/products?page=2')).toBe('/products');
    });

    it('should not match a different entity whose path merely shares a substring', () => {
      DynamicApiCachePathRegistryStore.register('Product2', 'product');

      // "/products" contains "product" as a substring, but not as a whole path segment.
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/products')).toBe('/products');
    });

    it('should return undefined when no registered path matches', () => {
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/health')).toBeUndefined();
    });

    it('should prefer the longest (most specific) match for overlapping registered paths', () => {
      DynamicApiCachePathRegistryStore.register('Item', 'items');
      DynamicApiCachePathRegistryStore.register('ArchivedItem', 'items/archive');

      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/items/archive/123')).toBe('/items/archive');
      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/items/123')).toBe('/items');
    });

    it('should ignore entities registered with an empty path', () => {
      DynamicApiCachePathRegistryStore.register('Root', '');

      expect(DynamicApiCachePathRegistryStore.findPrefixForUrl('/products')).toBe('/products');
    });
  });

  describe('findPathForUrl', () => {
    beforeEach(() => {
      DynamicApiCachePathRegistryStore.register('Message', '/messages/');
      DynamicApiCachePathRegistryStore.register('AdminMessage', 'admin/messages');
    });

    it.each([
      ['/messages', 'messages'],
      ['/api/messages/64f0000000000000000000a1', 'messages'],
      ['/api/v1/messages?page=2', 'messages'],
      ['/api/admin/messages/1', 'admin/messages'],
    ])('should resolve %s to the registered path %s', (url, expected) => {
      expect(DynamicApiCachePathRegistryStore.findPathForUrl(url)).toBe(expected);
    });

    it('should keep the most specific path whatever the registration order', () => {
      DynamicApiCachePathRegistryStore.reset();
      DynamicApiCachePathRegistryStore.register('AdminMessage', 'admin/messages');
      DynamicApiCachePathRegistryStore.register('Message', 'messages');

      expect(DynamicApiCachePathRegistryStore.findPathForUrl('/api/admin/messages/1')).toBe('admin/messages');
    });

    it('should return undefined when no registered path matches', () => {
      expect(DynamicApiCachePathRegistryStore.findPathForUrl('/api/health')).toBeUndefined();
    });
  });

  describe('normalizePath', () => {
    it.each([
      ['products', 'products'],
      ['/products/', 'products'],
      ['//admin//messages', 'admin/messages'],
      ['', ''],
    ])('should normalize %s to %s', (path, expected) => {
      expect(DynamicApiCachePathRegistryStore.normalizePath(path)).toBe(expected);
    });
  });

  describe('reset', () => {
    it('should clear every registered entity path', () => {
      DynamicApiCachePathRegistryStore.register('Product', 'products');
      DynamicApiCachePathRegistryStore.reset();

      expect(DynamicApiCachePathRegistryStore.getAll()).toEqual([]);
      expect(DynamicApiCachePathRegistryStore.getPath('Product')).toBeUndefined();
    });
  });
});
