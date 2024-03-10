import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AuthOptions } from '../modules';
import { ControllerOptions } from './controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';

const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

interface DynamicApiForRootOptions {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  useAuth?: AuthOptions;
}

interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: ControllerOptions<Entity>;
  routes?: DynamicAPIRouteConfig<Entity>[];
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DYNAMIC_API_GLOBAL_STATE };
