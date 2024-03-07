import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';
import { ControllerOptions } from './controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';

interface DynamicApiForRootOptions {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
}

interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: ControllerOptions<Entity>;
  routes?: DynamicAPIRouteConfig<Entity>[];
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions };
