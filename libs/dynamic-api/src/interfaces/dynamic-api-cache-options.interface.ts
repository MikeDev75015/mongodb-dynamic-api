import type Keyv from 'keyv';

interface DynamicApiCacheOptions {
  /**
   * The maximum number of items that can be stored in the cache.
   */
  max?: number;
  /**
   * The time to live in milliseconds. This is the maximum amount of time that an item can be in the cache before it is
   * removed.
   */
  ttl?: number;

  /**
   * Cache storage manager.  Default is `'memory'` (in-memory store).  See
   * [Different stores](https://docs.nestjs.com/techniques/caching#different-stores)
   * for more info.
   */
  store?: string | Keyv | Keyv[];

  isCacheableValue?: (value: any) => boolean;

  excludePaths?: string[];
}

export { DynamicApiCacheOptions };
