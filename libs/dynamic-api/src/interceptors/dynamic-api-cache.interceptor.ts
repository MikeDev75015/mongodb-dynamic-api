import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Cache } from 'cache-manager';
import { Observable, tap } from 'rxjs';
import { DISABLE_CACHE_KEY } from '../decorators';
import { DynamicApiGlobalState } from '../interfaces';
// Concrete path, not the `../services` barrel: see the same note in
// helpers/mixin-data.helper.ts — that barrel re-exports DynamicApiBroadcastService, which
// imports the helpers barrel this file's own import graph can reach.
import { DynamicApiCacheService } from '../services/dynamic-api-cache/dynamic-api-cache.service';

@Injectable()
/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export class DynamicApiCacheInterceptor extends CacheInterceptor {
  private readonly excludePaths = [
    '/',
    ...this.state.cacheExcludedPaths,
  ];

  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
    protected readonly reflector: Reflector,
    protected readonly httpAdapterHost: HttpAdapterHost,
    private readonly state: DynamicApiGlobalState,
    private readonly cacheService: DynamicApiCacheService,
  ) {
    super(cacheManager, reflector);
    this.httpAdapterHost = httpAdapterHost;
  }

  public intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (!this.state.isGlobalCacheEnabled) {
      return Promise.resolve(next.handle());
    }

    const req = context.switchToHttp().getRequest();
    const isWriteOperation = !this.allowedMethods.includes(req.method);

    if (isWriteOperation) {
      return Promise.resolve(
        next.handle().pipe(
          tap(() => { this.cacheService.invalidateForUrl(req.url); }),
        ),
      );
    }

    if (!this.isRequestCacheable(context)) {
      return Promise.resolve(next.handle());
    }

    return super.intercept(context, next);
  }

  private static readonly AUTH_PATH_PATTERN = /\/auth(\/|$|\?)/;

  /**
   * Cache key for a GET request. Defaults to `url+identity` (see
   * {@link DynamicApiCacheOptions.keyBy}): the authenticated caller's id is folded into the key so
   * two different users hitting the same URL never share a cached response. Falls back to the bare
   * URL for anonymous requests, or when `keyBy: 'url'` is explicitly configured.
   */
  protected trackBy(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    const url: string | undefined = req?.url;

    if (!url || this.state.cacheKeyBy !== 'url+identity') {
      return url;
    }

    const identity = DynamicApiCacheInterceptor.extractIdentity(req);
    return identity ? `${url}::${identity}` : url;
  }

  private static extractIdentity(req: { user?: { _id?: unknown; id?: unknown } }): string | undefined {
    const id = req?.user?._id ?? req?.user?.id;
    return id !== undefined && id !== null ? String(id) : undefined;
  }

  isRequestCacheable(context: ExecutionContext): boolean {
    const disableCache = this.reflector.get<boolean>(DISABLE_CACHE_KEY, context.getHandler());
    if (disableCache === true) {
      return false;
    }

    const req = context.switchToHttp().getRequest();
    return (
      this.state.isGlobalCacheEnabled &&
      this.allowedMethods.includes(req.method) &&
      !this.excludePaths.includes(req.url) &&
      !(this.state.isAuthEnabled && DynamicApiCacheInterceptor.AUTH_PATH_PATTERN.test(req.url))
    );
  }
}