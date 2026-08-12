import { ModuleMetadata, Type } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { BaseEntity } from '../models';
import { DynamicApiAuthOptions } from '../modules';
import { DynamicApiControllerOptions } from './dynamic-api-controller-options.interface';
import { DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { CustomRouteConfig } from './dynamic-api-custom-route.interface';
import { RoutesConfig } from './dynamic-api-global-state.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';
import { OnAfterSaveErrorHook } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

/** @deprecated Internal API — will be removed from public exports in v5. */
const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

interface DynamicApiForRootOptions<Entity extends BaseEntity = any, RegisterExtra = Record<never, never>> {
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  useAuth?: DynamicApiAuthOptions<Entity, RegisterExtra>;
  routesConfig?: Partial<RoutesConfig>;
  webSocket?: DynamicApiWebSocketOptions;
  broadcastGatewayOptions?: GatewayMetadata;
  /**
   * Global hook invoked whenever `callback` (the after-save hook) fails on any route,
   * after any configured `callbackRetry` attempts are exhausted. See {@link OnAfterSaveErrorHook}.
   */
  onAfterSaveError?: OnAfterSaveErrorHook;
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
  customRoutes?: CustomRouteConfig<Entity>[];
}

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DYNAMIC_API_GLOBAL_STATE };
