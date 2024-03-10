import { CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler } from '@nestjs/common';
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
      } as any;

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
      } as any;

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
      } as any;

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
      } as any;

      expect(interceptor.isRequestCacheable(context)).toBe(true);
    });
  });

  describe('intercept', () => {
    it('should return next.handle() if global cache is disabled', (done) => {
      state.isGlobalCacheEnabled = false;
      const context = {} as any;
      const next = { handle: () => of('handled') } as CallHandler;
      jest.spyOn(CacheInterceptor.prototype, 'intercept').mockResolvedValue(of('intercepted'));

      interceptor.intercept(context, next).then((obs) => {
        obs.subscribe((result) => {
          expect(result).toBe('handled');
          done();
        });
      });
    });

    it('should return super.intercept() if global cache is enabled', (done) => {
      state.isGlobalCacheEnabled = true;
      const context = {} as any;
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
