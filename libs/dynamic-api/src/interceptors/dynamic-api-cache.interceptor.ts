import { CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Observable } from 'rxjs';
import { DynamicApiGlobalState } from '../interfaces';

@Injectable()
export class DynamicApiCacheInterceptor extends CacheInterceptor {
  private readonly excludePaths = [
    '/',
    ...this.state.cacheExcludedPaths,
  ];

  constructor(
    protected readonly cacheManager: any,
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

    return super.intercept(context, next);
  }

  isRequestCacheable(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    return (
      this.state.isGlobalCacheEnabled &&
      this.allowedMethods.includes(req.method) &&
      !this.excludePaths.includes(req.url)
    );
  }
}