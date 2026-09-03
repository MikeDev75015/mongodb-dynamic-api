/**
 * Symbols removed from `mongodb-dynamic-api`'s public exports in v5 that have **no direct,
 * mechanical replacement** — the migration tool can only flag these for manual review, it cannot
 * safely rewrite them (unlike `DynamicApiGlobalStateService.getEntityModel()` or the
 * `@Schema`+`@DynamicApiSchemaOptions` stack, which are handled by dedicated transforms).
 *
 * Each entry's `guidance` is the message shown next to every file that still imports it.
 */
interface RemovedSymbol {
  name: string;
  guidance: string;
}

const REMOVED_SYMBOLS: RemovedSymbol[] = [
  // Presence — the concrete adapter classes are gone, but there IS a supported migration path.
  {
    name: 'InMemoryPresenceAdapter',
    guidance: "use DynamicApiPresenceModule.register({ adapter: 'memory' }) and inject the DYNAMIC_API_PRESENCE_ADAPTER token instead of importing the concrete class.",
  },
  {
    name: 'RedisPresenceAdapter',
    guidance: "use DynamicApiPresenceModule.register({ adapter: 'redis', redisUrl, redisTtlSeconds }) and inject the DYNAMIC_API_PRESENCE_ADAPTER token instead of importing the concrete class.",
  },
  // Base services / mixins / builders / guards / gateways / interceptors / filters / logger —
  // internal wiring for the auto-generated routes, never meant to be used directly, no
  // replacement is offered because no supported use case needs one.
  {
    name: 'BaseService',
    guidance: 'internal base class for the auto-generated route services — no replacement, was never meant to be extended directly.',
  },
  {
    name: 'RoutePoliciesGuardMixin',
    guidance: 'internal wiring for ability-predicate guards — no replacement, configure abilityPredicate on the route instead.',
  },
  {
    name: 'SocketPoliciesGuardMixin',
    guidance: 'internal wiring for WebSocket ability-predicate guards — no replacement, configure abilityPredicate on the route instead.',
  },
  {
    name: 'EntityBodyMixin',
    guidance: 'internal DTO-building for the auto-generated routes — no replacement, was never meant to be called directly.',
  },
  {
    name: 'EntityPresenterMixin',
    guidance: 'internal DTO-building for the auto-generated routes — no replacement, was never meant to be called directly.',
  },
  {
    name: 'AuthDecoratorsBuilder',
    guidance: 'internal Swagger/route-decorator wiring for the auth module — no replacement.',
  },
  {
    name: 'RouteDecoratorsBuilder',
    guidance: 'internal Swagger/route-decorator wiring for the auto-generated routes — no replacement.',
  },
  {
    name: 'BasePoliciesGuard',
    guidance: 'internal base class for ability-predicate guards — no replacement, configure abilityPredicate on the route instead.',
  },
  {
    name: 'BaseSocketPoliciesGuard',
    guidance: 'internal base class for WebSocket ability-predicate guards — no replacement, configure abilityPredicate on the route instead.',
  },
  {
    name: 'DynamicApiJwtAuthGuard',
    guidance: "internal global guard installed by useAuth — no replacement, use @Public() to exempt a route instead of referencing this guard directly.",
  },
  {
    name: 'JwtSocketGuard',
    guidance: 'internal WebSocket JWT guard installed by enableDynamicAPIWebSockets — no replacement.',
  },
  { name: 'JwtAuthGuard', guidance: 'internal auth guard — no replacement, use @Public()/useAuth configuration instead.' },
  { name: 'JwtRefreshGuard', guidance: 'internal auth guard for /auth/refresh-token — no replacement.' },
  { name: 'JwtSocketAuthGuard', guidance: 'internal WebSocket auth guard — no replacement.' },
  { name: 'JwtSocketRefreshGuard', guidance: 'internal WebSocket auth guard — no replacement.' },
  { name: 'LocalAuthGuard', guidance: 'internal auth guard for /auth/login — no replacement.' },
  { name: 'PasswordlessGuard', guidance: 'internal auth guard — no replacement.' },
  { name: 'ResetPasswordGuard', guidance: 'internal auth guard — no replacement.' },
  {
    name: 'BaseGateway',
    guidance: 'internal base class for the auto-generated WebSocket gateways — no replacement, use DynamicApiBroadcastService.broadcastFromHttp() from a custom route instead.',
  },
  {
    name: 'createDynamicApiBroadcastGateway',
    guidance: 'internal gateway factory — no replacement, wired automatically by enableDynamicAPIWebSockets.',
  },
  {
    name: 'DynamicApiCacheInterceptor',
    guidance: 'internal interceptor wired automatically for cached routes — no replacement, use DynamicApiCacheService to invalidate manually if needed.',
  },
  {
    name: 'MergeIdParamInterceptor',
    guidance: 'internal interceptor for UpdateOne\'s :id param — no replacement, was never meant to be applied directly.',
  },
  {
    name: 'DynamicAPIWsExceptionFilter',
    guidance: 'internal WebSocket exception filter wired automatically — no replacement.',
  },
  {
    name: 'MongoDBDynamicApiLogger',
    guidance: 'internal logger wrapper — no replacement, use the MONGODB_DYNAMIC_API_LOGGER environment variable to control its output instead of instantiating it yourself.',
  },
  // Internal DTOs & decorators
  { name: 'ManyEntityQuery', guidance: 'internal query DTO for *Many routes — no replacement, was never meant to be imported directly.' },
  { name: 'DeletePresenter', guidance: 'internal response DTO for delete routes — no replacement, was never meant to be imported directly.' },
  { name: 'EntityParam', guidance: 'internal :id path-param DTO — no replacement, was never meant to be imported directly.' },
  { name: 'EntityQuery', guidance: 'internal empty query DTO — no replacement, was never meant to be imported directly.' },
  { name: 'ApiEndpointVisibility', guidance: 'internal Swagger visibility decorator — no replacement.' },
  { name: 'RateLimit', guidance: 'internal rate-limit decorator applied automatically to sensitive auth routes — no replacement, configure rateLimit in useAuth options instead.' },
  { name: 'ValidatorPipe', guidance: 'internal validation pipe wired automatically — no replacement, configure enableDynamicAPIValidation instead.' },
  { name: 'IS_PUBLIC_KEY', guidance: 'internal metadata key behind @Public() — no replacement, use the @Public() decorator itself.' },
  // Internal interfaces
  { name: 'DynamicApiDecoratorBuilder', guidance: 'internal builder contract — no replacement.' },
  { name: 'PoliciesGuard', guidance: 'internal guard contract — no replacement, configure abilityPredicate on the route instead.' },
  { name: 'PoliciesGuardConstructor', guidance: 'internal guard contract — no replacement.' },
  { name: 'AuthPoliciesGuardConstructor', guidance: 'internal guard contract — no replacement.' },
  { name: 'RouteModule', guidance: 'internal route-module union type — no replacement.' },
  { name: 'DYNAMIC_API_GLOBAL_STATE', guidance: 'internal DI token — no replacement, use DynamicApiEntityService.getModel() instead.' },
  { name: 'Credentials', guidance: 'internal global-state shape — no replacement.' },
  { name: 'EntitySchemas', guidance: 'internal global-state shape — no replacement.' },
  { name: 'DynamicApiGlobalState', guidance: 'internal global-state shape — no replacement.' },
  { name: 'AfterSaveCallbackConfig', guidance: 'internal callback wiring shape — no replacement, use the AfterSaveCallback type instead.' },
  { name: 'GatewayResponse', guidance: 'internal WebSocket response wrapper type — no replacement.' },
  // Internal modules & helpers
  { name: 'AuthModule', guidance: "internal module wired automatically by useAuth — no replacement, configure useAuth on DynamicApiModule.forRoot() instead." },
  { name: 'DynamicApiConfigModule', guidance: 'internal config module — no replacement.' },
  { name: 'BaseAuthService', guidance: 'internal base class for the auth module — no replacement.' },
  { name: 'JwtStrategy', guidance: 'internal Passport strategy wired automatically by useAuth — no replacement.' },
  { name: 'JwtRefreshStrategy', guidance: 'internal Passport strategy wired automatically by useAuth — no replacement.' },
  { name: 'HealthController', guidance: 'internal controller wired automatically by DynamicApiHealthModule — no replacement.' },
  { name: 'createHealthController', guidance: 'internal controller factory — no replacement, use DynamicApiHealthModule instead.' },
  { name: 'PresenceController', guidance: "internal controller wired by DynamicApiPresenceModule.register({ enableController: true }) — no replacement, was never meant to be imported directly." },
  { name: 'createPresenceGateway', guidance: 'internal gateway factory — no replacement, wired automatically by DynamicApiPresenceModule.' },
];

export { REMOVED_SYMBOLS };
export type { RemovedSymbol };
