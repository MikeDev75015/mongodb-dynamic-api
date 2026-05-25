import { ModuleMetadata, Type } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { BaseEntity } from '../models';
import { DynamicApiAuthOptions } from '../modules';
import { DynamicApiControllerOptions } from './dynamic-api-controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { DynamicApiCustomRouteConfig } from './dynamic-api-custom-route.interface';
import { RoutesConfig } from './dynamic-api-global-state.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

/** @deprecated Internal API — will be removed from public exports in v5. */
const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

interface DynamicApiForRootOptions<Entity extends BaseEntity = any> {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  useAuth?: DynamicApiAuthOptions<Entity>;
  routesConfig?: Partial<RoutesConfig>;
  webSocket?: DynamicApiWebSocketOptions;
  broadcastGatewayOptions?: GatewayMetadata;
}

interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: DynamicApiControllerOptions<Entity>;
  routes?: DynamicAPIRouteConfig<Entity>[];
  webSocket?: DynamicApiWebSocketOptions;
  extraImports?: ModuleMetadata['imports'],
  extraProviders?: ModuleMetadata['providers'],
  extraControllers?: ModuleMetadata['controllers'],
  /**
   * Custom routes registered at the same controller path/tag as the MDA standard routes.
   * Each entry generates a fully typed NestJS controller method with model injection,
   * Swagger documentation, optional guards and ability-predicate support.
   */
  customRoutes?: DynamicApiCustomRouteConfig<Entity>[];
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DYNAMIC_API_GLOBAL_STATE };
