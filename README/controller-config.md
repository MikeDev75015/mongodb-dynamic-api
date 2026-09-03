[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

> 🗂️ Looking for **route-level** options (`dTOs`, `callback`, `beforeSaveCallback`, `broadcast`…)?  
> See [Route Configuration](./route-config.md).

---

# Controller Configuration

`DynamicApiModule.forFeature()` accepts a configuration object (`DynamicApiForFeatureOptions`) that lets you control how the controller and its routes behave. This page documents every available option at the **feature** and **controller** levels.

## 📋 Table of Contents

- [forFeature Options](#forfeature-options)
  - [entity](#entity)
  - [controllerOptions](#controlleroptions)
  - [routes](#routes)
  - [webSocket (feature-level)](#websocket-feature-level)
  - [extraImports](#extraimports)
  - [extraProviders](#extraproviders)
  - [extraControllers](#extracontrollers)
  - [customRoutes](#customroutes)
    - [`customRoutes` vs. a native CRUD route](#customroutes-vs-a-native-crud-route)
    - [targetParam](#targetparam)
    - [authAbilityPredicate](#authabilitypredicate)
    - [inject](#inject)
    - [dTOs.params](#dtosparams)
    - [ctx.methods](#ctxmethods--callbackmethods-inside-a-custom-route)
- [controllerOptions Reference](#controlleroptions-reference)
  - [path](#path)
  - [apiTag](#apitag)
  - [version](#version)
  - [isPublic](#ispublic)
  - [disableCache](#disablecache)
  - [validationPipeOptions](#validationpipeoptions)
  - [abilityPredicates](#abilitypredicates)
  - [routesConfig](#routesconfig)
  - [useInterceptors](#useinterceptors)
- [Priority Rules](#priority-rules)
- [Examples](#examples)

---

## forFeature Options

```typescript
interface DynamicApiForFeatureOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;                                          // Required
  controllerOptions: DynamicApiControllerOptions<Entity>;        // Required
  routes?: DynamicApiRouteConfig<Entity>[];                      // Optional — see route-config.md
  webSocket?: GatewayMetadata | boolean;                         // Optional — feature-level WS
  extraImports?: ModuleMetadata['imports'];                      // Optional — extra NestJS imports
  extraProviders?: ModuleMetadata['providers'];                  // Optional — extra NestJS providers
  extraControllers?: ModuleMetadata['controllers'];              // Optional — extra NestJS controllers
  customRoutes?: CustomRouteConfig<Entity>[];          // Optional — custom endpoints
}
```

---

### entity

**Required.** The Mongoose entity class for which the API is generated. Must extend `BaseEntity` or `SoftDeletableEntity`.

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
})
```

---

### controllerOptions

**Required.** Controls how the generated controller is configured. See the [full reference below](#controlleroptions-reference).

---

### routes

**Optional.** An array of route configuration objects. If omitted, all routes defined in the global `routesConfig.defaults` (minus `routesConfig.excluded`) are generated automatically.

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'CreateOne' },
  ],
  // Only these 3 routes will be generated
})
```

> 📚 See [Route Configuration](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/route-config.md) for all route-level options.

---

### webSocket (feature-level)

**Optional.** Enables WebSocket support for **all routes** in this feature. Accepts `true` for default gateway settings, or a `GatewayMetadata` object for custom options.

This is a convenience shorthand: it is equivalent to setting `webSocket: true` on every route individually.

A route-level `webSocket` option takes precedence over this feature-level setting.

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  webSocket: true, // All routes also exposed via WebSocket
})

// With custom gateway options
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: { path: 'orders' },
  webSocket: {
    namespace: '/orders',
    cors: { origin: 'https://myapp.com' },
  },
})
```

---

### extraImports

**Optional.** Additional NestJS modules to import into the feature module. Useful when custom providers or interceptors have dependencies.

```typescript
import { HttpModule } from '@nestjs/axios';

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  extraImports: [HttpModule],
})
```

---

### extraProviders

**Optional.** Additional NestJS providers (services, guards, etc.) to register in the feature module.

```typescript
import { NotificationService } from './notification.service';
import { AuditService } from './audit.service';

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  extraProviders: [NotificationService, AuditService],
  routes: [
    {
      type: 'CreateOne',
      callback: async (product, methods) => {
        // NotificationService and AuditService are available in this module
      },
    },
  ],
})
```

---

### extraControllers

**Optional.** Additional NestJS controllers to register alongside the generated controller.

```typescript
import { ProductStatsController } from './product-stats.controller';

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  extraControllers: [ProductStatsController],
})
```

---

### customRoutes

**Optional.** An array of custom endpoint configurations registered at the same controller `path` and `version` as the MDA standard routes. Each entry generates a fully typed NestJS controller method with automatic Mongoose model injection, Swagger documentation, optional guards and `abilityPredicate` support.

> The Mongoose model is automatically available in the handler via `ctx.model`. No extra providers or module imports are needed. Need an application service too (a mailer, a payment client, ...)? See [inject](#inject) below.

#### `customRoutes` vs. a native CRUD route

Both let you attach `abilityPredicate`, guards, DTOs, and WebSocket exposure — the difference is *what runs the request*: a native route's behavior (query shape, cascade, callbacks, broadcast) is entirely declarative, driven by MDA's generated service; a custom route's `handler` is your own function with direct model access and no generated behavior at all.

| | Native route (`routes: [...]`) + hooks | `customRoutes` |
|---|---|---|
| Request handling | MDA-generated (find/create/update/delete logic) | Your own `handler` function, full control |
| Typical use | Standard CRUD, optionally reshaped via `beforeSaveCallback`/`callback`/`fromUser`/`@DerivedField` | An endpoint whose logic doesn't fit the CRUD shape at all (e.g. `PATCH /:id/e2ee-wrapped-keys`, a computed/aggregated read, a multi-collection write) |
| Response DTO | Standard entity presenter, or `dTOs.presenter` to reshape | Whatever `handler` returns, optionally through `dTOs.presenter` |
| Cascade delete, soft-delete filtering, `predicateBehavior: 'filter'` | ✅ Built in | ❌ You implement it yourself if needed |
| `beforeSaveCallback`/`callback`/`broadcast` | ✅ Built in | ❌ Not applicable — call `ctx.model` / broadcast yourself inside `handler` |
| Swagger docs | Auto-generated from the route type + DTOs | Auto-generated from `method`/`path`/`dTOs` |

**Rule of thumb:** if what you need is "a CRUD route, but slightly different" (extra validation, a derived field, blocking non-owners, notifying on success), reach for `abilityPredicate` + `beforeSaveCallback`/`callback` on a **native route** first — see [Route Configuration](./route-config.md) and [Callbacks](./callbacks.md). Reach for `customRoutes` only when the operation genuinely isn't a single-entity CRUD operation (spans collections, has no direct entity-shaped body, or needs bespoke query logic) — the E2EE-wrapped-key example below is a good template for that case.

#### `CustomRouteConfig<Entity>` reference

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | `string` | ✅ | Route sub-path appended to the controller base path. Supports route params (e.g. `:id/e2ee-wrapped-keys`). |
| `method` | `'GET' \| 'POST' \| 'PATCH' \| 'PUT' \| 'DELETE'` | ✅ | HTTP method. |
| `handler` | `(ctx: CustomRouteContext<Entity, Body, Query, Params>, injected: unknown[]) => Promise<Response>` | ✅ | Pure async function executed when the route is matched. `injected` holds the resolved `inject` providers, in order (empty array when `inject` isn't set). |
| `inject` | `Array<Type<unknown> \| string \| symbol>` | ➖ | Application providers to resolve and pass to `handler`'s second argument. See [inject](#inject) below. |
| `version` | `string` | ➖ | Route-level version override. Falls back to `controllerOptions.version`. |
| `isPublic` | `boolean` | ➖ | Skip JWT guard for this route. Falls back to `controllerOptions.isPublic`. |
| `description` | `string` | ➖ | Swagger `summary`. Auto-generated if omitted. |
| `guards` | `Type<CanActivate>[]` | ➖ | Extra NestJS guard classes applied **after** the ability-predicate guard. |
| `abilityPredicate` | `AbilityPredicate<Entity>` | ➖ | Ability predicate identical to `DynamicApiRouteConfig.abilityPredicate`. Generates a `RoutePoliciesGuard` automatically. |
| `authAbilityPredicate` | `AuthAbilityPredicate<unknown, Body>` | ➖ | User-level predicate `(user, body?) => boolean` for **document-less** routes (an admin dashboard, a bulk action, ...). Checked directly, never by scanning a collection. See [authAbilityPredicate](#authabilitypredicate) below. |
| `predicateBehavior` | `'throw' \| 'filter'` | ➖ | Controls ability-predicate behavior. |
| `targetParam` | `string` | ➖ | Name of the route param identifying the document `abilityPredicate` should check, when the route's path param isn't named `id` (e.g. `path: 'parental-consent/:userId'` needs `targetParam: 'userId'`). See [targetParam](#targetparam) below. |
| `validationPipeOptions` | `ValidationPipeOptions` | ➖ | Merged with `controllerOptions.validationPipeOptions`. |
| `webSocket` | `boolean \| GatewayMetadata` | ➖ | Exposes the route **via WebSocket** in addition to HTTP. `true` for default gateway options, or a `GatewayMetadata` object for custom config. Auto-generates a gateway class alongside the controller. |
| `eventName` | `string` | ➖ | Custom WS event name. Default: `kebabCase('custom/{path}/{entityName}')` → e.g. `custom-metadata-conversation`. In WS context `params` and `query` are always `{}` — include everything in the message body. |
| `dTOs.body` | `Type` | ➖ | DTO class for request body validation and Swagger `@ApiBody`. |
| `dTOs.query` | `Type` | ➖ | DTO class for query string validation and Swagger `@ApiQuery`. |
| `dTOs.params` | `Type` | ➖ | Class documenting the route's path param(s) for Swagger/OpenAPI — one `@ApiParam` per property. **Docs only**, unlike `body`/`query` — doesn't validate/transform `ctx.params`. See [dTOs.params](#dtosparams) below. |
| `dTOs.presenter` | `Type & Partial<Mappable<Entity>>` | ➖ | Response presenter. If it exposes `fromEntity`, the handler result is mapped through it; otherwise raw result is returned (with `ClassSerializerInterceptor`). |

#### targetParam

`abilityPredicate` on a custom route can mean two different things depending on whether the Guard
finds a **single target document** to check, or falls back to checking every document matching
the request's query string instead. The Guard only ever looks for a route param named literally
`id` to decide which case it's in — standard MDA routes always use that name, but a custom route's
`path` can use anything (`:userId`, `:code`, `:conversationId`, ...).

Without `targetParam`, a route like `path: 'parental-consent/:userId'` silently falls into the
**wrong** branch: the Guard never sees `:userId` at all, so `abilityPredicate` ends up evaluated
against whatever documents match the (usually empty) query string — not the document the route is
actually about. Nothing errors; the predicate still runs, just against unrelated data, so the
authorization check the route was written for silently doesn't happen.

```typescript
// ❌ abilityPredicate never actually checks the :userId in the URL
{
  path: 'parental-consent/:userId',
  method: 'PATCH',
  abilityPredicate: isSameFamilyNotSelf,
  handler: async ({ model, params }) => model.findByIdAndUpdate(params.userId, { consented: true }),
}

// ✅ targetParam tells the Guard which param is the real target
{
  path: 'parental-consent/:userId',
  method: 'PATCH',
  targetParam: 'userId',
  abilityPredicate: isSameFamilyNotSelf,
  handler: async ({ model, params }) => model.findByIdAndUpdate(params.userId, { consented: true }),
}
```

If a route looks like it needs this and doesn't have it, a boot-time warning is logged (via
[`MONGODB_DYNAMIC_API_LOGGER`](./debugging.md), silent unless that's set): `abilityPredicate` is
set, `predicateBehavior` isn't `'filter'`, the path has at least one param, and none of them is
named `id` or matches `targetParam`.

#### authAbilityPredicate

`abilityPredicate` is checked by loading the document(s) it should evaluate against. Most custom
routes have one (`targetParam`/`:id` for a single document, the query string for a list) — but a
**document-less** route (an admin overview/dashboard, a bulk action that targets ids from the
body, anything that computes or summarizes rather than reading/writing one document) has nothing
to load. Without a document to check, the Guard falls back to scanning every document in
`entity`'s own collection matching the query string — and on an empty or not-yet-populated
collection (an audit-log entity before any moderation action ever happened, say), that scan finds
nothing to check. Nothing errors: the Guard just returns `true`, silently granting access to
**any authenticated user**, not just the ones the predicate would actually allow.

```typescript
// ❌ Fails open on an empty/unrelated collection — nothing to scan means nothing gets checked
{
  path: 'overview',
  method: 'GET',
  abilityPredicate: (_auditLogEntry, user) => user.role === 'admin',
  handler: async () => computeAdminOverview(),
}
```

`authAbilityPredicate` evaluates directly against `(user, body)` — no document read, so no
collection to be empty. It's checked unconditionally when set, independently of
`abilityPredicate`/`predicateBehavior`/`targetParam`; a missing/falsy `user` or a predicate
returning `false` always denies with `403 Forbidden` — there's no vacuous-pass case:

```typescript
// ✅ Checked directly against the user — never scans a collection, never fails open
{
  path: 'overview',
  method: 'GET',
  authAbilityPredicate: (user) => user.role === 'admin',
  handler: async () => computeAdminOverview(),
}
```

Use `abilityPredicate` (+ `targetParam` when needed) for routes about one document or a list of
documents, and `authAbilityPredicate` for routes that aren't about any specific document at all.

#### inject

A custom route handler only ever gets `{ model, user, params, body, query, req }` — there's no way
to reach an application service (a mailer, a payment gateway client, anything registered as a Nest
provider) from inside it. Without `inject`, needing one meant bailing out of `customRoutes`
entirely into a hand-written Nest controller that reimplements its own JWT guard and does raw
Mongoose access from scratch, just to get that one service.

`inject` lists provider tokens — the same tokens `@Inject()` accepts (a class, a string token, or a
symbol token) — resolved on every request via `ModuleRef.get(token, { strict: false })` and passed
to `handler`'s **second** argument, in the same order:

```typescript
import { CustomRouteConfig } from 'mongodb-dynamic-api';
import { MailService } from '../mail/mail.service';
import { Family } from './family.entity';
import { InviteFamilyMemberDto } from './invite-family-member.dto';

const inviteMemberRoute: CustomRouteConfig<Family, InviteFamilyMemberDto> = {
  path: 'invite-member',
  method: 'POST',
  inject: [MailService],
  handler: async (ctx, [mailService]) => {
    const mail = mailService as MailService; // inject is untyped — cast to the real type
    await mail.send(ctx.body.email, 'invite', { familyId: ctx.params.id });
    return { sent: true };
  },
};
```

`strict: false` resolves app-wide, not just within whatever module registered the entity's
`forFeature()` — `MailService` (or whatever you inject) just needs to be a provider **somewhere**
reachable in your app's module graph, same as any other cross-module Nest injection. Omit `inject`
(or leave it empty) and `handler`'s second argument is just an empty array — every existing
`customRoutes` handler keeps working unchanged, since a JS function is free to ignore extra
arguments it doesn't declare.

#### dTOs.params

`dTOs.body` and `dTOs.query` were always reflected into Swagger (`@ApiBody`/`@ApiQuery`) — a custom
route's **path** params had no equivalent. OpenAPI codegen tools (e.g. `ng-openapi-gen`) generate
their client function's signature straight from the OpenAPI document, so with nothing declaring
the param, the generated function had an empty params interface and never substituted the
placeholder(s) in the URL — the workaround was writing that one client-side call function by hand.

`dTOs.params` is a class with one property per path param — give each a **field initializer with a
representative value** (not just a TS type annotation), the same convention the built-in
`EntityParam` (`id = ''`) already follows for native routes: the property's runtime type is what
gets reflected as the param's Swagger type.

```typescript
class InviteMemberParams {
  familyId = '';
}

const inviteMemberRoute: CustomRouteConfig<Family> = {
  path: ':familyId/invite-member',
  method: 'POST',
  dTOs: { params: InviteMemberParams },
  handler: async (ctx) => { /* ctx.params.familyId, now documented in Swagger too */ },
};
```

This only affects the generated OpenAPI document — one `@ApiParam` entry per declared property.
It does **not** validate or transform `ctx.params`, which stays the raw `Record<string, string>`
NestJS parses from the URL regardless of whether `dTOs.params` is set.

#### `CustomRouteContext<Entity, Body, Query, Params>` fields

| Field | Type | Description |
|---|---|---|
| `model` | `Model<Entity>` | Injected Mongoose model for the entity. |
| `user` | `unknown` | Authenticated user from `req.user`. `undefined` for public routes. |
| `params` | `Params` | Parsed route params (e.g. `{ id: '...' }`). |
| `body` | `Body` | Parsed request body. |
| `query` | `Query` | Parsed query string object. |
| `methods` | `CallbackMethods` | The same read/write primitives every `beforeSaveCallback`/`callback` receives, for any entity (not just `Entity`) — see below. |
| `req` | `DynamicApiRequest \| undefined` | Raw HTTP request. HTTP only — `undefined` in WebSocket/gateway handlers. |

##### `ctx.methods` — `CallbackMethods` inside a custom route

`ctx.model` gives raw Mongoose access, but a raw `model.updateOne(...)`/`model.findOneAndUpdate(...)`
write bypasses the native pipeline entirely — including its automatic `@DerivedField({ on: 'save' })`
recompute. `ctx.methods` is the same `CallbackMethods` bundle documented under
[CallbackMethods](./route-config.md#callbackmethods) — `findOneDocument`, `updateOneDocument`,
`rawUpdateOneDocument`, `recomputeDerivedFields`, etc. — each taking its own `entity` argument, so
it works for any entity, not only the one this route is mounted on.

```typescript
{
  path: ':id/activate',
  method: 'PATCH',
  handler: async ({ params, methods }) => {
    // updateOneDocument recomputes any @DerivedField on User automatically — a raw
    // ctx.model.updateOne(...) here would leave it stale.
    await methods.updateOneDocument(User, { _id: params.id }, { $set: { isActive: true } });
    return methods.findOneDocument(User, { _id: params.id });
  },
}
```

#### Example — `PATCH /conversations/:id/e2ee-wrapped-keys`

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { Prop } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BaseEntity,
  DynamicApiSchema,
  DynamicApiModule,
  CustomRouteConfig,
} from 'mongodb-dynamic-api';

// ── Entity ────────────────────────────────────────────────────────────────────
@DynamicApiSchema({ collection: 'conversations' })
class Conversation extends BaseEntity {
  @Prop({ type: String, required: true }) encryptedContent: string;
  @Prop({ type: String }) wrappedKey: string;
  @Prop({ type: String }) ownerId: string;
}

// ── Body DTO ──────────────────────────────────────────────────────────────────
class UpdateWrappedKeyBody {
  @IsNotEmpty() @IsString()
  wrappedKey: string;
}

// ── Params DTO (Swagger/OpenAPI docs for the :id path param) ──────────────────
class UpdateWrappedKeyParams {
  id = '';
}

// ── Custom guard ──────────────────────────────────────────────────────────────
@Injectable()
class OwnConversationGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // custom logic here …
    if (!req.user) throw new ForbiddenException('Not authenticated');
    return true;
  }
}

// ── Feature module ────────────────────────────────────────────────────────────
const customRoute: CustomRouteConfig<Conversation, UpdateWrappedKeyBody> = {
  path: ':id/e2ee-wrapped-keys',
  method: 'PATCH',
  description: 'Update the E2EE wrapped key for a conversation',
  guards: [OwnConversationGuard],
  abilityPredicate: (entity: Conversation, user: { sub: string }) =>
    entity.ownerId === user.sub,
  dTOs: { body: UpdateWrappedKeyBody, params: UpdateWrappedKeyParams },
  handler: async ({ model, params, body }) =>
    (model as Model<Conversation>).findByIdAndUpdate(
      params.id,
      { $set: { wrappedKey: body.wrappedKey } },
      { new: true, lean: true },
    ),
};

DynamicApiModule.forFeature({
  entity: Conversation,
  controllerOptions: { path: 'conversations' },
  customRoutes: [customRoute],
});
```

This registers `PATCH /conversations/:id/e2ee-wrapped-keys` alongside the standard MDA routes. The controller is auto-named `CustomIdE2eeWrappedKeysConversationController` to avoid DI collisions.

---

#### Example — WebSocket on a custom route

```typescript
import { Model } from 'mongoose';
import { io } from 'socket.io-client';
import {
  BaseEntity,
  DynamicApiSchema,
  DynamicApiModule,
  CustomRouteConfig,
} from 'mongodb-dynamic-api';
import { Prop } from '@nestjs/mongoose';

@DynamicApiSchema({ collection: 'conversations' })
class Conversation extends BaseEntity {
  @Prop({ type: String, required: true }) encryptedContent: string;
  @Prop({ type: String }) wrappedKey: string;
}

// Custom route exposed via HTTP AND WebSocket
const customRoute: CustomRouteConfig<Conversation> = {
  path: 'metadata',
  method: 'GET',
  isPublic: true,
  webSocket: true,                  // Also expose as WS event
  eventName: 'conversation-meta',   // Optional: override auto-generated event name
  handler: async () => ({ version: '2.0', algo: 'AES-256' }),
};

DynamicApiModule.forFeature({
  entity: Conversation,
  controllerOptions: { path: 'conversations' },
  customRoutes: [customRoute],
});

// ── Client-side usage ──────────────────────────────────────────────────────────
// Auto event (no eventName): 'custom-metadata-conversation'
// Custom event (eventName: 'conversation-meta'): 'conversation-meta'
const socket = io('http://localhost:3000');
socket.emit('conversation-meta');
socket.on('conversation-meta', (data) => {
  console.log(data); // { version: '2.0', algo: 'AES-256' }
});
```

> **WS context note:** In WebSocket context, `params` and `query` are always `{}` — include all required data in the message **body**. The `user` field is populated from the JWT token passed in the socket handshake query (`accessToken`) when auth is enabled.

---

## controllerOptions Reference

```typescript
interface DynamicApiControllerOptions<Entity extends BaseEntity> {
  // Required
  path: string;

  // Swagger
  apiTag?: string;

  // Versioning
  version?: string;

  // Authentication
  isPublic?: boolean;

  // Caching
  disableCache?: boolean;

  // Validation
  validationPipeOptions?: ValidationPipeOptions;

  // Authorization
  abilityPredicates?: ControllerAbilityPredicate<Entity>[];

  // Route defaults override
  routesConfig?: {
    defaults?: RouteType[];
    excluded?: RouteType[];
  };

  // Interceptors
  useInterceptors?: Type<NestInterceptor>[];
}
```

---

### path

**Required.** The URL path segment for this controller. All generated routes will be prefixed with this path.

```typescript
controllerOptions: { path: 'products' }
// → GET /products, POST /products, PATCH /products/:id, etc.

controllerOptions: { path: 'api/v1/catalog' }
// → GET /api/v1/catalog, POST /api/v1/catalog, etc.
```

---

### apiTag

**Optional.** Custom label used as the **Swagger tag** for grouping all routes of this controller in the API documentation. Also determines the **WebSocket event name prefix** instead of the entity class name.

```typescript
controllerOptions: {
  path: 'products',
  apiTag: 'Product Catalog',
}
// Swagger: all routes grouped under "Product Catalog"
// WS events: get-many-product-catalog, create-one-product-catalog, etc.
```

**apiTag vs entity name:**

| Setting | Swagger group | WS event example |
|---|---|---|
| No `apiTag` (entity: `Product`) | `Product` | `get-many-product` |
| `apiTag: 'Items'` | `Items` | `get-many-items` |
| `apiTag: 'Product Catalog'` | `Product Catalog` | `get-many-product-catalog` |

---

### version

**Optional.** Default API version for **all routes** in this controller. Must be a numeric string (`'1'`, `'2'`, ..., `'99'`). Individual routes can override this with their own `version` field.

Requires `enableDynamicAPIVersioning(app)` to be called in `main.ts`.

```typescript
controllerOptions: {
  path: 'products',
  version: '1',
}
// → GET /v1/products, POST /v1/products, etc.
```

> 📚 See [Versioning guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/versioning.md) for full setup.

---

### isPublic

**Optional.** When set to `true`, **all routes** in this controller are publicly accessible without a JWT token, even when authentication is globally enabled.

A route-level `isPublic` takes precedence over this setting.

```typescript
controllerOptions: {
  path: 'categories',
  isPublic: true, // All routes are public
}

// Mix public controller + protected routes
controllerOptions: {
  path: 'products',
  isPublic: true,       // Default: public
},
routes: [
  { type: 'GetMany' },  // ✅ Public (inherits controller setting)
  { type: 'GetOne' },   // ✅ Public (inherits controller setting)
  { type: 'CreateOne', isPublic: false }, // 🔒 Protected (overrides controller)
  { type: 'DeleteOne', isPublic: false }, // 🔒 Protected (overrides controller)
]
```

---

### disableCache

**Optional.** When set to `true`, caching is disabled for **all read routes** (GetMany, GetOne, Aggregate) in this controller. Write operations will not auto-purge the cache, and the manual purge endpoint (`DELETE /{path}/cache`) will not be generated.

A route-level `disableCache` takes precedence over this setting.

```typescript
// Disable cache for the entire feature
controllerOptions: {
  path: 'orders',
  disableCache: true, // No caching on any read route
}

// Mix cached and uncached routes
controllerOptions: {
  path: 'products',
  disableCache: true,       // Default: no cache
},
routes: [
  { type: 'GetMany' },     // ❌ Not cached (inherits controller setting)
  { type: 'GetOne', disableCache: false }, // ✅ Cached (overrides controller)
]
```

> 📚 See [Caching guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/caching.md) for full details on cache control, auto-purge, and the manual purge endpoint.

---

### validationPipeOptions

**Optional.** Configures the `ValidationPipe` applied to **all routes** in this controller. Accepts any `ValidationPipeOptions` from `@nestjs/common`. A route-level `validationPipeOptions` takes precedence.

The default value is `{ transform: true }` if not specified.

```typescript
controllerOptions: {
  path: 'products',
  validationPipeOptions: {
    whitelist: true,            // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,            // Auto-transform types (e.g., string → number)
    transformOptions: {
      enableImplicitConversion: true,
    },
  },
}
```

Common options:

| Option | Type | Description |
|---|---|---|
| `whitelist` | `boolean` | Remove properties not decorated with a validator |
| `forbidNonWhitelisted` | `boolean` | Throw an error if non-whitelisted properties are present |
| `transform` | `boolean` | Auto-convert primitive types |
| `transformOptions` | `object` | Options for `class-transformer` |
| `skipMissingProperties` | `boolean` | Skip validation on missing properties |
| `groups` | `string[]` | Validation groups to use |

> 📚 See [Validation guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/validation.md) for full details.

---

### abilityPredicates

**Optional.** An array of authorization rules that apply to **specific route types** in this controller. Each entry maps one or more route types to a predicate function.

```typescript
type ControllerAbilityPredicate<Entity> = {
  targets: RouteType[];              // Which route types this rule applies to
  predicate: (entity: Entity, user: any) => boolean; // Authorization check
};
```

```typescript
controllerOptions: {
  path: 'products',
  abilityPredicates: [
    {
      // Only authenticated active users can read
      targets: ['GetMany', 'GetOne'],
      predicate: (product, user) => user.isActive === true,
    },
    {
      // Only admins or the product owner can modify
      targets: ['UpdateOne', 'ReplaceOne', 'DeleteOne'],
      predicate: (product, user) =>
        user.role === 'admin' || product.ownerId === user.id,
    },
    {
      // Only admins can create or bulk-delete
      targets: ['CreateOne', 'CreateMany', 'DeleteMany'],
      predicate: (product, user) => user.role === 'admin',
    },
  ],
}
```

**How predicates work:**
- The predicate receives the **fetched entity** and the **authenticated user** from the JWT token.
- Return `true` to allow access, `false` to throw a `403 Forbidden`.
- A route-level `abilityPredicate` overrides the controller-level predicate for that specific route.

> 📚 See [Authorization guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/authorization.md) for full details.

---

### routesConfig

**Optional.** Overrides the **global default route list** for this specific controller. Useful when you want different defaults than what's set in `forRoot`.

```typescript
type RoutesConfig = {
  defaults?: RouteType[]; // Route types to generate by default
  excluded?: RouteType[]; // Route types to exclude from defaults
};
```

```typescript
controllerOptions: {
  path: 'products',
  routesConfig: {
    // Only generate these 4 routes by default (ignores global defaults)
    defaults: ['GetMany', 'GetOne', 'CreateOne', 'DeleteOne'],
  },
}

// Or: use global defaults but exclude some
controllerOptions: {
  path: 'orders',
  routesConfig: {
    excluded: ['DeleteMany', 'DuplicateMany', 'DuplicateOne'],
  },
}
```

**Interaction with `routes` array:**
- Routes explicitly listed in the `routes` array are always included.
- `routesConfig.defaults` determines which types are auto-generated if not listed in `routes`.
- `routesConfig.excluded` removes types from the auto-generated set.
- Routes with a `subPath` are always included regardless of `routesConfig`.

**Global defaults (set in `forRoot`):**

```typescript
// Default global routesConfig (all 11 CRUD types + auto-excluded: none)
[
  'GetMany', 'GetOne',
  'CreateMany', 'CreateOne',
  'UpdateMany', 'UpdateOne',
  'ReplaceOne',
  'DuplicateMany', 'DuplicateOne',
  'DeleteMany', 'DeleteOne',
]
```

---

### useInterceptors

**Optional.** An array of NestJS interceptor classes to apply to **all routes** in this controller. Route-level `useInterceptors` are applied in addition to (not instead of) controller-level interceptors.

```typescript
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

controllerOptions: {
  path: 'products',
  useInterceptors: [LoggingInterceptor, MetricsInterceptor],
}
```

> **Note:** `ClassSerializerInterceptor` is automatically applied to all routes. You do not need to include it manually.

---

## Priority Rules

When the same option is available at multiple levels, the following priority applies (highest → lowest):

| Option | Route level | Controller level | Global (`forRoot`) |
|---|:---:|:---:|:---:|
| `isPublic` | ✅ highest | ✅ | ❌ |
| `disableCache` | ✅ highest | ✅ | ✅ (`useGlobalCache`) |
| `version` | ✅ highest | ✅ | ❌ |
| `validationPipeOptions` | ✅ highest | ✅ | ❌ |
| `abilityPredicate` | ✅ highest | ✅ (`abilityPredicates`) | ❌ |
| `webSocket` | ✅ highest | ❌ | ✅ (global gateway) |
| `routesConfig` | ❌ | ✅ highest | ✅ |
| `useInterceptors` | ✅ (added on top) | ✅ | ❌ |

---

## Examples

### Minimal configuration

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products', // All 11 CRUD routes generated automatically
  },
})
```

### Read-only public catalog

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'catalog',
    apiTag: 'Product Catalog',
    isPublic: true,
    routesConfig: {
      defaults: ['GetMany', 'GetOne'],
    },
  },
})
// → GET /catalog (public)
// → GET /catalog/:id (public)
```

### Versioned controller with validation

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    version: '2',
    validationPipeOptions: {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'UpdateOne' },
  ],
})
// → GET /v2/users, GET /v2/users/:id, PATCH /v2/users/:id
```

### Role-based access control with ability predicates

```typescript
DynamicApiModule.forFeature({
  entity: Post,
  controllerOptions: {
    path: 'posts',
    abilityPredicates: [
      {
        targets: ['GetMany', 'GetOne'],
        predicate: (post, user) => post.isPublished || user.role === 'admin',
      },
      {
        targets: ['UpdateOne', 'DeleteOne'],
        predicate: (post, user) =>
          post.authorId === user.id || user.role === 'admin',
      },
    ],
  },
})
```

### Custom routes with controller defaults

```typescript
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
    routesConfig: {
      // Generate only these by default
      defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne'],
      // And never generate these even if listed in forRoot defaults
      excluded: ['DeleteMany'],
    },
  },
  routes: [
    // These are always added regardless of routesConfig
    {
      type: 'GetMany',
      subPath: 'archived', // Sub-path routes bypass routesConfig
    },
    {
      type: 'Aggregate',
      dTOs: { query: OrderStatsQuery },
    },
  ],
})
```

### Complete feature with all options

```typescript
import { HttpModule } from '@nestjs/axios';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { NotificationService } from './notification.service';
import { ExtraProductsController } from './extra-products.controller';

DynamicApiModule.forFeature({
  entity: Product,

  controllerOptions: {
    path: 'products',
    apiTag: 'Products',
    version: '1',
    isPublic: false,
    disableCache: false, // Cache enabled (default) — auto-purge on write + manual purge endpoint
    validationPipeOptions: { whitelist: true, transform: true },
    useInterceptors: [LoggingInterceptor],
    abilityPredicates: [
      {
        targets: ['UpdateOne', 'DeleteOne'],
        predicate: (product, user) => user.role === 'admin',
      },
    ],
    routesConfig: {
      excluded: ['DuplicateMany'],
    },
  },

  routes: [
    { type: 'GetMany', isPublic: true },
    { type: 'GetOne', isPublic: true },
    {
      type: 'CreateOne',
      dTOs: { body: CreateProductBody, presenter: ProductPresenter },
      callback: async (product, methods) => {
        await methods.createOneDocument(AuditLog, {
          action: 'CREATE',
          entityId: product.id,
        });
      },
    },
    { type: 'UpdateOne', dTOs: { presenter: ProductPresenter } },
    { type: 'DeleteOne' },
  ],

  webSocket: { namespace: '/products' },

  extraImports: [HttpModule],
  extraProviders: [NotificationService],
  extraControllers: [ExtraProductsController],
})
```


