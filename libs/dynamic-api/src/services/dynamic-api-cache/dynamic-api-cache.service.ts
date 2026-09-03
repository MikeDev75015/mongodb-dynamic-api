import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Type } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DynamicApiCachePathRegistryStore } from '../../helpers/cache-path-registry.store';
import { MongoDBDynamicApiLogger } from '../../logger/mongo-dynamic-api.logger';

/**
 * Injectable service for invalidating `DynamicApiCacheInterceptor`'s response cache — scoped to a
 * single entity rather than wiping every cached response.
 *
 * `DynamicApiModule.forFeature`/`CreateOne`/`UpdateOne`/`DeleteOne`/... already invalidate the
 * right entity automatically on every write made through the generated HTTP routes — you don't
 * need this for that. Inject it yourself when you write to the database **outside** the HTTP
 * request cycle, since nothing there triggers `DynamicApiCacheInterceptor` at all: a cron job, a
 * queue consumer, or any service that fetches its model via
 * `DynamicApiGlobalStateService.getEntityModel(Entity)` and writes directly.
 *
 * @example — invalidating after a raw write in a cron job
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { Cron } from '@nestjs/schedule';
 * import { DynamicApiCacheService, DynamicApiGlobalStateService } from 'mongodb-dynamic-api';
 * import { Conversation } from './conversation.entity';
 *
 * @Injectable()
 * export class ConversationPurgeService {
 *   constructor(private readonly cacheService: DynamicApiCacheService) {}
 *
 *   @Cron('0 * * * *')
 *   async purgeExpired() {
 *     const model = await DynamicApiGlobalStateService.getEntityModel(Conversation);
 *     await model.deleteMany({ expiresAt: { $lt: new Date() } });
 *
 *     // Nothing else would ever invalidate GetMany/GetOne responses cached for Conversation —
 *     // this write never goes through DynamicApiCacheInterceptor.
 *     await this.cacheService.invalidate(Conversation);
 *   }
 * }
 * ```
 *
 * Same story for a `CustomRouteConfig` handler writing through `ctx.methods` (see
 * `CallbackMethods`) — also outside the native pipeline. Being `@Global()`, this service is
 * reachable from `inject` with zero extra setup (no `extraProviders` entry needed, unlike an
 * application-defined service):
 *
 * @example — invalidating from a custom route handler, via `inject`
 * ```typescript
 * import { CustomRouteConfig, DynamicApiCacheService } from 'mongodb-dynamic-api';
 *
 * const bulkRenameRoute: CustomRouteConfig<Product> = {
 *   path: 'bulk-rename',
 *   method: 'POST',
 *   inject: [DynamicApiCacheService],
 *   handler: async ({ methods, body }, [cacheService]) => {
 *     const { from, to } = body as { from: string; to: string };
 *     await methods.updateManyDocuments(Product, { name: from }, { $set: { name: to } });
 *     await (cacheService as DynamicApiCacheService).invalidate(Product);
 *     return { renamed: true };
 *   },
 * };
 * ```
 */
@Injectable()
class DynamicApiCacheService {
  private readonly logger = new MongoDBDynamicApiLogger(DynamicApiCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Invalidates every cached response for `entity`'s routes (`GetMany`, `GetOne`, `Aggregate`,
   * and any custom sub-path under the same controller) — never other entities' cached responses.
   *
   * `id` is accepted for call-site clarity (documenting which document changed) but doesn't
   * currently narrow invalidation further: a cached list response can't be selectively patched
   * without inspecting its contents, so any write to an entity invalidates that entity's cache as
   * a whole. This is still far narrower than a full `clear()`.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see the id doc above: accepted
  // for call-site clarity, not currently used to narrow invalidation.
  async invalidate(entity: Type, id?: string): Promise<void> {
    const path = DynamicApiCachePathRegistryStore.getPath(entity.name);
    if (!path) {
      this.logger.warn(
        `[Cache] invalidate() called for "${entity.name}", which has no registered controller `
        + 'path (was it registered via DynamicApiModule.forFeature?). Falling back to a full clear().',
      );
      await this.cacheManager.clear();
      return;
    }

    await this.invalidatePrefix(`/${path.replace(/^\/+/, '')}`);
  }

  /** Clears the entire response cache, for every entity. Prefer {@link invalidate} when possible. */
  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  /**
   * Resolves which registered entity (if any) owns `url`, then invalidates just that entity's
   * cache. Used internally by `DynamicApiCacheInterceptor` on every write request. Falls back to
   * a full {@link clear} when no registered entity matches — e.g. a write outside any
   * DynamicApi-generated route — so a write is never left without *some* invalidation.
   */
  async invalidateForUrl(url: string): Promise<void> {
    const prefix = DynamicApiCachePathRegistryStore.findPrefixForUrl(url);

    if (!prefix) {
      await this.cacheManager.clear();
      return;
    }

    await this.invalidatePrefix(prefix);
  }

  private async invalidatePrefix(prefix: string): Promise<void> {
    let sawIterableStore = false;

    for (const store of this.cacheManager.stores) {
      if (typeof store.iterator !== 'function') {
        continue;
      }
      sawIterableStore = true;

      for await (const [key] of store.iterator(undefined)) {
        if (typeof key === 'string' && DynamicApiCacheService.matchesPrefix(key, prefix)) {
          await this.cacheManager.del(key);
        }
      }
    }

    if (!sawIterableStore) {
      this.logger.warn(
        `[Cache] No configured cache store supports key enumeration — falling back to a full `
        + `clear() to invalidate "${prefix}". Configure a store with iterator support (the default `
        + 'in-memory store already does) for scoped invalidation.',
      );
      await this.cacheManager.clear();
    }
  }

  private static matchesPrefix(key: string, prefix: string): boolean {
    if (key === prefix) {
      return true;
    }
    if (!key.startsWith(prefix)) {
      return false;
    }

    // Only a real path/identity boundary counts as a match — "/products" must not match a
    // "/products-extra" key that merely happens to share the same string prefix.
    const boundary = key[prefix.length];
    return boundary === '/' || boundary === '?' || boundary === ':';
  }
}

export { DynamicApiCacheService };
