import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';
import { DynamicApiAuthOptions } from '../modules';
import { DynamicApiControllerOptions } from './dynamic-api-controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';

const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

interface DynamicApiForRootOptions {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  useAuth?: DynamicApiAuthOptions;
}

interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: DynamicApiControllerOptions<Entity>;
  routes?: DynamicAPIRouteConfig<Entity>[];
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DYNAMIC_API_GLOBAL_STATE };
