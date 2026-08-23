import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DynamicModule, Module } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DYNAMIC_API_GLOBAL_STATE, DynamicApiGlobalState } from '../../interfaces';
// Concrete path, not the `../../services` barrel: that barrel also re-exports
// DynamicApiBroadcastService, which imports the helpers barrel — going through it here risks the
// same circular-require crash worked around in helpers/mixin-data.helper.ts.
import { DynamicApiCacheService } from '../../services/dynamic-api-cache/dynamic-api-cache.service';

@Module({})
export class DynamicApiConfigModule {
  static register(config: DynamicApiGlobalState): DynamicModule {
    return {
      global: true,
      module: DynamicApiConfigModule,
      providers: [
        {
          provide: DYNAMIC_API_GLOBAL_STATE,
          useValue: config,
        },
        {
          provide: DynamicApiCacheService,
          inject: [CACHE_MANAGER],
          useFactory: (cacheManager: Cache) => new DynamicApiCacheService(cacheManager),
        },
      ],
      exports: [DYNAMIC_API_GLOBAL_STATE, DynamicApiCacheService],
    };
  }
}
