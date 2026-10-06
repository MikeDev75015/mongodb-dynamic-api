import type Keyv from 'keyv';
import { AuthAbilityPredicate } from './dynamic-api-ability.interface';

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

  /**
   * How cached GET responses are keyed.
   *
   * - `'url+identity'` (default) — the cache key includes the authenticated caller's identity
   *   (`req.user`'s `id`/`_id`/`sub`), so two different users hitting the same URL never share a
   *   cached response. Falls back to a plain URL key for anonymous/public requests.
   * - `'url'` — the pre-4.23 behavior: the cache key is the bare request URL, shared by every
   *   caller. Only safe for routes whose response is genuinely identical for every caller
   *   (fully public data with no per-user filtering), since the first authenticated caller to
   *   hit a URL would otherwise freeze that response for everyone who follows.
   *
   * @default 'url+identity'
   */
  keyBy?: 'url' | 'url+identity';
}

/**
 * Controls the `DELETE /<path>/cache` route generated for every cached entity.
 *
 * Set globally with `DynamicApiModule.forRoot(uri, { cachePurge })` and override per entity with
 * `controllerOptions.cachePurge` (fields set on the entity win). `false` is short for
 * `{ enabled: false }`: the route is not generated, responses are still cached.
 *
 * @example
 * ```typescript
 * DynamicApiModule.forRoot(process.env.MONGO_DB_URL, {
 *   useAuth: { userEntity: User, jwt: { secret: 'secret', refreshSecret: 'refresh-secret' } },
 *   cachePurge: { authAbilityPredicate: (user: User) => user.isAdmin },
 * });
 * ```
 */
interface CachePurgeOptions {
  /**
   * Generate the route. `false` removes it without disabling the entity's cache.
   * @default true
   */
  enabled?: boolean;
  /**
   * Checked against the authenticated user before the purge runs. Missing user or `false` → `403`.
   * Without it, any authenticated user can purge the entity's cache.
   */
  authAbilityPredicate?: AuthAbilityPredicate<unknown>;
}

/** `cachePurge` value: options, or `false` (short for `{ enabled: false }`). */
type CachePurgeConfig = CachePurgeOptions | false;

export { DynamicApiCacheOptions, CachePurgeOptions, CachePurgeConfig };
