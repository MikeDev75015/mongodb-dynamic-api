export * from './dynamic-api-controller-options.interface';
export * from './dynamic-api-custom-route.interface';
export * from './dynamic-api-request.interface';
// `dynamic-api-decorator-builder.interface` is internal wiring for the route-decorator builders —
// not part of the public API.
export * from './dynamic-api-cache-options.interface';
export * from './dynamic-api-ability.interface';
export * from './dynamic-api-broadcast-config.interface';
export * from './dynamic-api-cascade-config.interface';
export * from './dynamic-api-entity-mappers.interface';
// Only `RoutesConfig` (used by `DynamicApiForRootOptions.routesConfig`) is public here —
// `Credentials`, `EntitySchemas` and `DynamicApiGlobalState` are internal state shapes.
export { RoutesConfig } from './dynamic-api-global-state.interface';
// `DYNAMIC_API_GLOBAL_STATE` is an internal DI token — `DynamicApiForFeatureOptions`/
// `DynamicApiForRootOptions` are the public option types.
export { DynamicApiForFeatureOptions, DynamicApiForRootOptions } from './dynamic-api-options.interface';
// `dynamic-api-policy-handler.interface` is internal wiring for the generated policy guards — not
// part of the public API.
export * from './dynamic-api-route-config.interface';
export * from './dynamic-api-route-dtos-bundle.type';
// `dynamic-api-route-module.type` is internal wiring — not part of the public API.
export * from './dynamic-api-route-response.type';
export * from './dynamic-api-route-type.type';
export * from './dynamic-api-schema-options.interface';
export * from './dynamic-api-service-before-save-callback.interface';
// `AfterSaveCallbackConfig` is an internal bundle passed to route service-provider factories — not
// part of the public API.
export {
  AfterSaveCallback,
  DynamicApiServiceCallback,
  DynamicApiResetPasswordCallback,
  DynamicApiCallbackMethods,
  DynamicApiResetPasswordCallbackMethods,
  CallbackMethods,
  CallbackRetryOptions,
  OnAfterSaveErrorHook,
  MongoUpdateOperators,
} from './dynamic-api-service-callback.interface';
export * from './dynamic-api-service-provider.interface';
export * from './dynamic-api-swagger-options.type';
// `GatewayResponse` is an internal WebSocket-gateway return-type helper — not part of the public
// API.
export {
  CustomSocketEventConfig,
  DynamicApiWebSocketOptions,
  DynamicApiWebSocketSetupOptions,
  ExtendedSocket,
  GatewayOptions,
} from './dynamic-api-web-socket.interface';
export * from './dynamic-api-presence.interface';
export * from './dynamic-api-health-check.interface';
export * from './dynamic-api-rate-limit.interface';
export * from './dynamic-api-audit-log.interface';
