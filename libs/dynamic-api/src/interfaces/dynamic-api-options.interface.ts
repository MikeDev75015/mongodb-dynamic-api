import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';
import { DynamicApiAuthOptions } from '../modules';
import { DynamicApiControllerOptions } from './dynamic-api-controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { RoutesConfig } from './dynamic-api-global-state.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

interface DynamicApiForRootOptions<Entity extends BaseEntity = any> {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  useAuth?: DynamicApiAuthOptions<Entity>;
  routesConfig?: Partial<RoutesConfig>;
  webSocket?: DynamicApiWebSocketOptions;
}

interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: DynamicApiControllerOptions<Entity>;
  routes?: DynamicAPIRouteConfig<Entity>[];
  webSocket?: DynamicApiWebSocketOptions;
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DYNAMIC_API_GLOBAL_STATE };
