import { beforeEach, describe, expect, it } from 'vitest';
import { DynamicModule } from '@nestjs/common';
import { DYNAMIC_API_GLOBAL_STATE } from '../../interfaces/dynamic-api-options.interface';
import { DynamicApiGlobalState } from '../../interfaces/dynamic-api-global-state.interface';
import { DynamicApiCacheService } from '../../services/dynamic-api-cache/dynamic-api-cache.service';
import { DynamicApiConfigModule } from './dynamic-api-config.module';

describe('DynamicApiConfigModule', () => {
  let module: DynamicModule;
  const config: DynamicApiGlobalState = {
    cacheExcludedPaths: [],
    cacheKeyBy: 'url+identity',
    connectionName: '',
    credentials: undefined,
    initialized: false,
    isAuthEnabled: false,
    isGlobalCacheEnabled: false,
    jwtSecret: '',
    jwtExpirationTime: 0,
    jwtRefreshTokenExpiresIn: 0,
    jwtRefreshSecret: undefined,
    jwtRefreshUseCookie: undefined,
    onAfterSaveError: undefined,
    refreshTokenOnUpdate: false,
    refreshTokenField: undefined,
    additionalRequestFields: [],
    routesConfig: undefined,
    uri: '',
    gatewayOptions: undefined,
    broadcastGatewayOptions: undefined,
  };

  describe('register', () => {
    beforeEach(() => {
      module = DynamicApiConfigModule.register(config);
    });

    it('should return a dynamic module', () => {
      expect(module).toBeDefined();
    });

    it('should set the module as global', () => {
      expect(module.global).toBe(true);
    });

    it('should set the module as DynamicApiConfigModule', () => {
      expect(module.module).toBe(DynamicApiConfigModule);
    });

    it('should provide the DYNAMIC_API_GLOBAL_STATE token', () => {
      expect(module.providers).toEqual([
        {
          provide: DYNAMIC_API_GLOBAL_STATE,
          useValue: config,
        },
        {
          provide: DynamicApiCacheService,
          inject: ['CACHE_MANAGER'],
          useFactory: expect.any(Function),
        },
      ]);
    });

    it('should provide DynamicApiCacheService via a factory that injects CACHE_MANAGER', () => {
      const provider = (module.providers as any[])[1];
      const fakeCacheManager = { fake: true };

      const service = provider.useFactory(fakeCacheManager);

      expect(service).toBeInstanceOf(DynamicApiCacheService);
      expect(service['cacheManager']).toBe(fakeCacheManager);
    });

    it('should export the DYNAMIC_API_GLOBAL_STATE token and DynamicApiCacheService', () => {
      expect(module.exports).toEqual([DYNAMIC_API_GLOBAL_STATE, DynamicApiCacheService]);
    });
  });
});
