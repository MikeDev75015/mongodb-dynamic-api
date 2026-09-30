interface CachePathEntry {
  entityName: string;
  path: string;
}

/**
 * Static, process-wide registry mapping every entity registered via `DynamicApiModule.forFeature`
 * to its controller `path`. Populated by `DynamicApiModule.forFeature` at module-registration time
 * (before any request is served), and consumed by `DynamicApiCacheService` to resolve which
 * entity a given cached URL or write request belongs to — the basis for scoped cache invalidation
 * (as opposed to a blanket `cacheManager.clear()`).
 *
 * Internal to the library — deliberately not exported from `helpers/index.ts` so it never reaches
 * the package's public surface.
 */
class DynamicApiCachePathRegistryStore {
  private static readonly entries = new Map<string, CachePathEntry>();

  static register(entityName: string, path: string): void {
    // Re-registering the same entity (e.g. across repeated test app inits) just updates the path.
    DynamicApiCachePathRegistryStore.entries.set(entityName, { entityName, path });
  }

  static getAll(): CachePathEntry[] {
    return Array.from(DynamicApiCachePathRegistryStore.entries.values());
  }

  static getPath(entityName: string): string | undefined {
    return DynamicApiCachePathRegistryStore.entries.get(entityName)?.path;
  }

  /**
   * Given a request/cache-key URL, finds the registered entity path it belongs to and returns the
   * URL prefix that scopes every cache entry for that entity (e.g. `GetMany` at `/products`,
   * `GetOne` at `/products/:id`, `Aggregate` at `/products/aggregate` all share the
   * `/products` prefix). Matches whole path segments only (a registered path `'product'` never
   * matches a URL under `/products`), and prefers the longest (most specific) registered path when
   * more than one could match (e.g. `'items'` vs `'items/archive'`).
   */
  static findPrefixForUrl(url: string): string | undefined {
    return DynamicApiCachePathRegistryStore.findMatchForUrl(url)?.prefix;
  }

  /**
   * Same matching as {@link findPrefixForUrl}, but returns the registered path the URL belongs to
   * (normalized, without leading/trailing slashes) — whatever sits in front of it (a global
   * prefix such as `/api`, a URI version segment).
   */
  static findPathForUrl(url: string): string | undefined {
    return DynamicApiCachePathRegistryStore.findMatchForUrl(url)?.path;
  }

  /** `'/products/'` → `'products'`: the form {@link findPathForUrl} returns. */
  static normalizePath(path: string): string {
    return path.split('/').filter(Boolean).join('/');
  }

  private static findMatchForUrl(url: string): { prefix: string; path: string } | undefined {
    const [pathname] = url.split('?');
    const urlSegments = pathname.split('/').filter(Boolean);

    let best: { prefix: string; path: string; segmentCount: number } | undefined;

    for (const { path } of DynamicApiCachePathRegistryStore.entries.values()) {
      const pathSegments = path.split('/').filter(Boolean);
      if (pathSegments.length === 0) {
        continue;
      }

      for (let start = 0; start <= urlSegments.length - pathSegments.length; start++) {
        const matches = pathSegments.every((segment, i) => urlSegments[start + i] === segment);
        if (!matches) {
          continue;
        }

        if (!best || pathSegments.length > best.segmentCount) {
          best = {
            prefix: `/${urlSegments.slice(0, start + pathSegments.length).join('/')}`,
            path: pathSegments.join('/'),
            segmentCount: pathSegments.length,
          };
        }
        break;
      }
    }

    return best && { prefix: best.prefix, path: best.path };
  }

  /** Clears every registered entity path — useful for testing. */
  static reset(): void {
    DynamicApiCachePathRegistryStore.entries.clear();
  }
}

export { DynamicApiCachePathRegistryStore, CachePathEntry };
