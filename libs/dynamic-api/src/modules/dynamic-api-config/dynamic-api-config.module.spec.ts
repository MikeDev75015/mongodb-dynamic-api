import { DynamicModule } from '@nestjs/common';
import { DYNAMIC_API_GLOBAL_STATE, DynamicApiGlobalState } from '../../interfaces';
import { DynamicApiConfigModule } from './dynamic-api-config.module';

describe('DynamicApiConfigModule', () => {
  let module: DynamicModule;
  const config: DynamicApiGlobalState = {
    cacheExcludedPaths: [],
    connectionName: '',
    credentials: undefined,
    initialized: false,
    isAuthEnabled: false,
    isGlobalCacheEnabled: false,
    jwtSecret: '',
    jwtExpirationTime: 0,
    routesConfig: undefined,
    uri: '',
    gatewayOptions: undefined,
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
      ]);
    });

    it('should export the DYNAMIC_API_GLOBAL_STATE token', () => {
      expect(module.exports).toEqual([DYNAMIC_API_GLOBAL_STATE]);
    });
  });
});
