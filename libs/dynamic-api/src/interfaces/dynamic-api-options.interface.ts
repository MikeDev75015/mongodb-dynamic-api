import { ModuleMetadata, Type } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { GatewayMetadata } from '@nestjs/websockets';
import { BaseEntity } from '../models';
import { DynamicApiAuthOptions } from '../modules';
import { DynamicApiControllerOptions } from './dynamic-api-controller-options.interface';
import { CachePurgeConfig, DynamicApiCacheOptions } from './dynamic-api-cache-options.interface';
import { CustomRouteConfig } from './dynamic-api-custom-route.interface';
import { RoutesConfig } from './dynamic-api-global-state.interface';
import { DynamicApiRouteConfig } from './dynamic-api-route-config.interface';
import { OnAfterSaveErrorHook } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

/** @internal Not part of the public API. */
const DYNAMIC_API_GLOBAL_STATE = Symbol('DYNAMIC_API_GLOBAL_STATE');

/**
 * Mongoose connection options accepted by `DynamicApiModule.forRoot(uri, { connectionOptions })` —
 * everything `MongooseModule.forRoot(uri, options)` accepts (driver options such as
 * `compressors`, `maxPoolSize`, `serverSelectionTimeoutMS`, and Nest options such as
 * `retryAttempts`), except `uri` and `connectionName`, which the module owns.
 */
type MongoConnectionOptions = Omit<MongooseModuleOptions, 'uri' | 'connectionName'>;

interface DynamicApiForRootOptions<Entity extends BaseEntity = any, RegisterExtra = Record<never, never>> {
  /**
   * Options forwarded as is to `MongooseModule.forRoot(uri, options)` for the module's MongoDB
   * connection — wire compression, pool size, timeouts, ... See {@link MongoConnectionOptions}.
   *
   * @example
   * ```typescript
   * DynamicApiModule.forRoot(process.env.MONGODB_URI, {
   *   connectionOptions: { compressors: ['zlib'], maxPoolSize: 20, serverSelectionTimeoutMS: 5000 },
   * })
   * ```
   */
  connectionOptions?: MongoConnectionOptions;
  useGlobalCache?: boolean;
  cacheOptions?: DynamicApiCacheOptions;
  /**
   * Default protection for every entity's `DELETE /<path>/cache` route. See {@link CachePurgeOptions}.
   */
  cachePurge?: CachePurgeConfig;
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
  routes?: DynamicApiRouteConfig<Entity>[];
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

export { DynamicApiForFeatureOptions, DynamicApiForRootOptions, MongoConnectionOptions, DYNAMIC_API_GLOBAL_STATE };
