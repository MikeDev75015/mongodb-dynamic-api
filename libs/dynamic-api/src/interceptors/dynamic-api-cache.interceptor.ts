import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Cache } from 'cache-manager';
import { Observable, tap } from 'rxjs';
import { DISABLE_CACHE_KEY } from '../decorators';
import { DynamicApiGlobalState } from '../interfaces';

@Injectable()
/** @deprecated Internal API — will be removed from public exports in v5. */
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
          tap(() => { this.cacheManager.clear(); }),
        ),
      );
    }

    if (!this.isRequestCacheable(context)) {
      return Promise.resolve(next.handle());
    }

    return super.intercept(context, next);
  }

  private static readonly AUTH_PATH_PATTERN = /\/auth(\/|$|\?)/;

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