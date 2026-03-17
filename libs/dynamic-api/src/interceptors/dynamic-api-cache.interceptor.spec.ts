import { CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { of } from 'rxjs';
import { DynamicApiGlobalState } from '../interfaces';
import { DynamicApiCacheInterceptor } from './dynamic-api-cache.interceptor';

describe('DynamicApiCacheInterceptor', () => {
  let interceptor: DynamicApiCacheInterceptor;
  let cacheManager: any;
  let reflector: Reflector;
  let httpAdapterHost: HttpAdapterHost;
  let state: DynamicApiGlobalState;

  beforeEach(() => {
    cacheManager = {};
    reflector = {} as Reflector;
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
          getRequest: () => ({
            method: 'GET',
            url: '/users',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if method is not allowed', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if path is excluded', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return true if global cache is enabled, method is allowed and path is not excluded', () => {
      state.isGlobalCacheEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/users',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });

    it('should return false if auth is enabled and path contains /auth/', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/auth/account',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with global prefix', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/api/auth/account',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with URI versioning', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/v1/auth/account',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return false if auth is enabled and path contains /auth/ with prefix and versioning', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/api/v1/auth/login',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(false);
    });

    it('should return true if auth is not enabled and path contains /auth/', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/auth/account',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });

    it('should return true for paths that contain auth but not as a segment', () => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/authors',
          }),
        }),
      } as unknown as ExecutionContext;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });
  });

  describe('intercept', () => {
    it('should return next.handle() if global cache is disabled', (done) => {
      state.isGlobalCacheEnabled = false;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/users',
          }),
        }),
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

    it('should return next.handle() if auth is enabled and path contains /auth/', (done) => {
      state.isGlobalCacheEnabled = true;
      state.isAuthEnabled = true;
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/auth/account',
          }),
        }),
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
          getRequest: () => ({
            method: 'GET',
            url: '/users',
          }),
        }),
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
  });
});
