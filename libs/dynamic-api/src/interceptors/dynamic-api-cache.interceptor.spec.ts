import { CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { of } from 'rxjs';
import { DISABLE_CACHE_KEY } from '../decorators';
import { DynamicApiGlobalState } from '../interfaces';
import { DynamicApiCacheInterceptor } from './dynamic-api-cache.interceptor';

describe('DynamicApiCacheInterceptor', () => {
  let interceptor: DynamicApiCacheInterceptor;
  let cacheManager: any;
  let reflector: Reflector;
  let httpAdapterHost: HttpAdapterHost;
  let state: DynamicApiGlobalState;

  const fakeHandler = () => ({});

  beforeEach(() => {
    cacheManager = { clear: jest.fn().mockResolvedValue(undefined) };
    reflector = { get: jest.fn().mockReturnValue(undefined) } as any;
    httpAdapterHost = {} as HttpAdapterHost;
    state = {
      cacheExcludedPaths: [],
    } as DynamicApiGlobalState;

    interceptor = new DynamicApiCacheInterceptor(cacheManager, reflector, httpAdapterHost, state);
  });

  describe('isRequestCacheable', () => {
    it('should return false if global cache is disabled', () => {
      state.isGlobalCacheEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if method is not allowed', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if path is excluded', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return true if global cache is enabled, method is allowed and path is not excluded', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });

    it('should return false if auth is enabled and path contains /auth/', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/auth/account' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with global prefix', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/api/auth/account' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with URI versioning', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/v1/auth/account' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with prefix and versioning', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/api/v1/auth/login' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return true if auth is not enabled and path contains /auth/', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/auth/account' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });

    it('should return true for paths that contain auth but not as a segment', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/authors' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });

    it('should return false if DISABLE_CACHE_KEY metadata is true on handler', () => {
      state.isGlobalCacheEnabled = true;
      (reflector.get as jest.Mock).mockReturnValue(true);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
      expect(reflector.get).toHaveBeenCalledWith(DISABLE_CACHE_KEY, fakeHandler());
    });

    it('should proceed normally if DISABLE_CACHE_KEY metadata is false', () => {
      state.isGlobalCacheEnabled = true;
      (reflector.get as jest.Mock).mockReturnValue(false);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });
  });

  describe('intercept', () => {
    it('should return next.handle() if global cache is disabled', (done) => {
      state.isGlobalCacheEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('handled') } as CallHandler;
      jest.spyOn(CacheInterceptor.prototype, 'intercept').mockResolvedValue(of('intercepted'));

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('handled');
          expect(cacheManager.clear).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should purge cache after a successful write operation', (done) => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('created') } as CallHandler;

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('created');
          expect(cacheManager.clear).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should purge cache after a DELETE operation', (done) => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'DELETE', url: '/users/123' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('deleted') } as CallHandler;

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('deleted');
          expect(cacheManager.clear).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should purge cache after a PATCH operation', (done) => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'PATCH', url: '/users/123' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('updated') } as CallHandler;

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('updated');
          expect(cacheManager.clear).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should not purge cache on write if global cache is disabled', (done) => {
      state.isGlobalCacheEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('created') } as CallHandler;

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('created');
          expect(cacheManager.clear).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should return next.handle() if auth is enabled and path contains /auth/', (done) => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/auth/account' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('handled') } as CallHandler;
      jest.spyOn(CacheInterceptor.prototype, 'intercept').mockResolvedValue(of('intercepted'));

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('handled');
          done();
        });
      });
    });

    it('should return super.intercept() if global cache is enabled and request is cacheable', (done) => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('handled') } as CallHandler;
      jest.spyOn(CacheInterceptor.prototype, 'intercept').mockResolvedValue(of('intercepted'));

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('intercepted');
          done();
        });
      });
    });

    it('should return next.handle() if disableCache metadata is true on a GET route', (done) => {
      state.isGlobalCacheEnabled = true;
      (reflector.get as jest.Mock).mockReturnValue(true);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/users' }),
        }),
        getHandler: fakeHandler,
      } as unknown as ExecutionContext;
      const next = { handle: () => of('handled') } as CallHandler;
      jest.spyOn(CacheInterceptor.prototype, 'intercept').mockResolvedValue(of('intercepted'));

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('handled');
          done();
        });
      });
    });
  });
});
