<p align="center">
  <h1 align="center">mongodb-dynamic-api</h1>
  <p align="center">
    A production-ready <strong>NestJS 12</strong> module that instantly generates fully typed REST APIs + WebSockets<br/>
    for any MongoDB collection — zero boilerplate, enterprise features included.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mongodb-dynamic-api"><img src="https://img.shields.io/npm/v/mongodb-dynamic-api.svg" alt="NPM version"/></a>
  <img src="https://img.shields.io/npm/l/mongodb-dynamic-api" alt="License"/>
  <img src="https://img.shields.io/npm/dw/mongodb-dynamic-api" alt="Weekly downloads"/>
</p>

<p align="center">
  <img src="https://img.shields.io/github/checks-status/MikeDev75015/mongodb-dynamic-api/main" alt="CI"/>
  <a href="https://app.circleci.com/pipelines/github/MikeDev75015/mongodb-dynamic-api"><img src="https://circleci.com/gh/MikeDev75015/mongodb-dynamic-api.svg?style=shield" alt="CircleCI"/></a>
  <img src="https://img.shields.io/sonar/quality_gate/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io" alt="Sonar Quality Gate"/>
  <img src="https://img.shields.io/sonar/coverage/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io" alt="Coverage"/>
</p>

<p align="center">
  <code>npm install --save mongodb-dynamic-api</code>
</p>

---

> [!WARNING]
> **v5 — Breaking changes.** The package's public export surface was curated: internal implementation classes, mixins, builders and helpers that were never meant to be imported directly are no longer exported from `mongodb-dynamic-api`. Everything documented in this README and in `README/*.md` is unaffected.
>
> <details>
> <summary>📋 Full list of removed public exports (v4 → v5)</summary>
>
> ### Why
> Since v1, every internal file was re-exported through `export *` barrels, so essentially every class/function/type under `libs/dynamic-api/src/**` leaked into the package's public API — including plumbing that only exists to build the auto-generated routes internally. None of it was ever documented, and importing it directly was never a supported usage. v5 curates the barrel down to what real consumers actually use.
>
> ### Removed — routes internals
> Every `Base*Service`, controller/gateway/presenter/body mixin, controller/gateway/service interface, route `*Module` class and route `*.helper.ts` factory function for all 12 route types (`Aggregate`, `CreateOne`/`CreateMany`, `UpdateOne`/`UpdateMany`, `ReplaceOne`, `DuplicateOne`/`DuplicateMany`, `DeleteOne`/`DeleteMany`, `GetOne`/`GetMany`), plus `createCustomRouteController`/`createCustomRouteGateway` and `createCachePurgeController`.
>
> ### Removed — base services
> `BaseService`, `BcryptService`, `DynamicApiBroadcastService`, `DynamicApiGlobalStateService`.
> `DynamicApiGlobalStateService.getEntityModel()` — the one capability consumers actually relied on (resolving a registered entity's Mongoose model outside the HTTP cycle) — is now exposed through a new, narrow **`DynamicApiEntityService.getModel(Entity)`**. See [caching.md](./README/caching.md) for the updated example.
>
> ### Removed — mixins & builders
> `RoutePoliciesGuardMixin`, `SocketPoliciesGuardMixin`, `EntityBodyMixin`, `EntityPresenterMixin`, `AuthDecoratorsBuilder`, `RouteDecoratorsBuilder`.
>
> ### Removed — guards, gateways, interceptors, filters, logger
> `BasePoliciesGuard`, `BaseSocketPoliciesGuard`, `DynamicApiJwtAuthGuard`, `JwtSocketGuard` and every internal auth guard (`JwtAuthGuard`, `JwtRefreshGuard`, `JwtSocketAuthGuard`, `JwtSocketRefreshGuard`, `LocalAuthGuard`, `PasswordlessGuard`, `ResetPasswordGuard`); `BaseGateway`, `createDynamicApiBroadcastGateway`; `DynamicApiCacheInterceptor`, `MergeIdParamInterceptor`; `DynamicAPIWsExceptionFilter`; `MongoDBDynamicApiLogger`.
>
> ### Removed — internal DTOs & decorators
> `ManyEntityQuery`, `DeletePresenter`, `EntityParam`, `EntityQuery`; `ApiEndpointVisibility`, `RateLimit`, `ValidatorPipe`, `IS_PUBLIC_KEY`.
>
> ### Removed — internal interfaces
> `DynamicApiDecoratorBuilder`, `PoliciesGuard`, `PoliciesGuardConstructor`, `AuthPoliciesGuardConstructor`, `RouteModule`, `DYNAMIC_API_GLOBAL_STATE`, `Credentials`, `EntitySchemas`, `DynamicApiGlobalState`, `AfterSaveCallbackConfig`, `GatewayResponse`.
>
> ### Removed — internal modules & helpers
> `AuthModule`, `DynamicApiConfigModule`, and every internal auth controller/gateway/policies-guard mixin, `BaseAuthService`, `JwtStrategy`, `JwtRefreshStrategy`; `HealthController`/`createHealthController`; `PresenceController`, `InMemoryPresenceAdapter`, `RedisPresenceAdapter`, `createPresenceGateway`. Most of `helpers/**` (internal wiring only — the documented `enableDynamicAPI*` functions, `mintTokenPair` and `parsePagingParams` are unaffected).
>
> ### Removed — `DeepPartial` typo alias
> `utils/deep-patial.ts` (a typo'd duplicate of `deep-partial.ts`, already marked "will be removed in v5") is deleted. `DeepPartial` itself is still exported — import it as before, from the main package.
>
> ### Unaffected
> `DynamicApiCacheService`, `DynamicApiEntityService`, `DynamicApiModule`, `DynamicApiHealthModule`, `DynamicApiPresenceModule`, all `decorators/`, all `predicates/`, `BaseEntity`/`SoftDeletableEntity`, every documented route-config/callback/auth/websocket/caching/authorization/validation/schema-options interface and type, and everything else shown in this README and `README/*.md` — none of it moved or changed shape.
>
> </details>

> [!WARNING]
> **v4 — Breaking changes.** Dual-token auth (`accessToken` + `refreshToken`), new default expiry (`expiresIn: '15m'`), 2 new endpoints (`/auth/refresh-token`, `/auth/logout`).
>
> <details>
> <summary>📋 Full migration guide (v3 → v4)</summary>
>
> ### 🔄 Dual-token authentication
> Login and register now return **`{ accessToken, refreshToken }`** instead of a single token.
> The `/auth/refresh-token` endpoint now requires the **refresh token**.
>
> ### ⏱️ New default expiration times
> | Token | v3 | v4 |
> |---|---|---|
> | Access token (`expiresIn`) | `'1d'` | **`'15m'`** |
> | Refresh token (`refreshTokenExpiresIn`) | — | **`'7d'`** |
>
> If your app relied on the `'1d'` lifetime, set it explicitly: `jwt: { expiresIn: '1d' }`.
>
> ### 🆕 Two new endpoints
> | Endpoint | Description |
> |---|---|
> | `POST /auth/refresh-token` | Get a new token pair using the refresh token |
> | `POST /auth/logout` | Invalidate the refresh token server-side (204 No Content) |
>
> ### 🔒 New options in `useAuth`
> - **`jwt.refreshSecret`** — dedicated signing secret for refresh tokens
> - **`refreshToken.refreshTokenField`** — entity field storing the bcrypt hash (server-side revocation)
> - **`refreshToken.useCookie`** — send/read refresh token via httpOnly cookie
>
> 📖 Full details: [README/authentication.md → Migration Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/authentication.md#migration-guide-v3--v4)
>
> </details>

---

## ✨ Features

<table>
<tr>
<td>

🚀 **Zero Boilerplate**<br/>
Full CRUD REST API generated from a single schema definition.

</td>
<td>

🔐 **JWT Authentication**<br/>
Dual-token (access + refresh), 8 built-in endpoints, cookie mode, server-side revocation.

</td>
</tr>
<tr>
<td>

🔓 **Passwordless / OTP** ⭐<br/>
Magic-link / OTP login flow with configurable token delivery.

</td>
<td>

🛡️ **Authorization**<br/>
Ability predicates — per-route access control in `filter` or `throw` mode.

</td>
</tr>
<tr>
<td>

⚡ **Smart Caching**<br/>
Global HTTP cache with auto-invalidation, `disableCache` per route or controller.

</td>
<td>

✅ **Validation**<br/>
`class-validator` integration, configurable `ValidationPipe` globally or per route.

</td>
</tr>
<tr>
<td>

📡 **WebSockets**<br/>
Socket.IO support, room-targeted broadcast, `onConnection` hook, debug mode.

</td>
<td>

🟢 **Presence** ⭐<br/>
Real-time online/offline tracking — InMemory or Redis adapter.

</td>
</tr>
<tr>
<td>

🔁 **Callbacks**<br/>
`beforeSave`, `afterSave`, `beforeDelete` hooks with typed context + authenticated user.

</td>
<td>

🌊 **Cascade Delete** ⭐<br/>
Cross-collection cascades with `beforeDeleteCallback` and soft-delete support.

</td>
</tr>
<tr>
<td>

🎛️ **Custom Routes** ⭐<br/>
Add any HTTP method with a custom service and WebSocket gateway in `forFeature`.

</td>
<td>

🏷️ **Field Decorators** ⭐<br/>
`@DerivedField` for computed values, `@ProtectedField` for runtime-stripped fields.

</td>
</tr>
<tr>
<td>

🔍 **Aggregate + Pagination**<br/>
MongoDB aggregation pipelines via `toPipeline`, auto-paginated with `$facet`.

</td>
<td>

📚 **Swagger UI**<br/>
Auto-generated OpenAPI documentation for every route, zero configuration.

</td>
</tr>
</table>

> All dependencies included — `@nestjs/mongoose`, `@nestjs/jwt`, `@nestjs/swagger`, `class-validator`, `socket.io` and more. **No extra installs.**

---

## ⚡ Quick Start

### 1 — Configure the root module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot(process.env.MONGODB_URI),
  ],
})
export class AppModule {}
```

### 2 — Define your entity

```typescript
// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { IsEmail, IsNotEmpty } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  name: string;

  @IsEmail()
  @Prop({ type: String, required: true, unique: true })
  email: string;
}
```

> `BaseEntity` automatically provides `id`, `createdAt`, `updatedAt` and excludes `_id` / `__v` from responses.

### 3 — Generate the API

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user.entity';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: { path: 'users' },
    }),
  ],
})
export class UsersModule {}
```

Register `UsersModule` in `AppModule`, run `npm run start:dev` — your API is live at `http://localhost:3000/users`. 🎉

---

## 📡 Generated Endpoints

| Route Type | Method | Path | Description |
|:-----------|:------:|:-----|:------------|
| `GetMany` | `GET` | `/users` | List all — supports MongoDB query params |
| `GetOne` | `GET` | `/users/:id` | Get a single document by ID |
| `CreateMany` | `POST` | `/users/many` | Bulk create — body: `{ list: User[] }` |
| `CreateOne` | `POST` | `/users` | Create a single document |
| `ReplaceOne` | `PUT` | `/users/:id` | Full replacement |
| `UpdateMany` | `PATCH` | `/users` | Partial update — query: `?ids[]=` |
| `UpdateOne` | `PATCH` | `/users/:id` | Partial update by ID |
| `DeleteMany` | `DELETE` | `/users` | Delete multiple — query: `?ids[]=` |
| `DeleteOne` | `DELETE` | `/users/:id` | Delete by ID |
| `DuplicateMany` | `POST` | `/users/duplicate` | Clone multiple with field overrides |
| `DuplicateOne` | `POST` | `/users/duplicate/:id` | Clone one with field overrides |
| `Aggregate` | `GET` | `/users/aggregate` | Custom aggregation pipeline (requires Query DTO) |

> Use the `routes` array in `forFeature` to cherry-pick, exclude, or fine-tune any route individually.

---

## 📚 Documentation

| Feature | Description | Guide |
|:--------|:------------|:-----:|
| 🗂️ **Entities** | `BaseEntity`, `SoftDeletableEntity`, timestamps, JSON transform | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/entities.md) |
| 🗃️ **Schema Options** | Indexes, lifecycle hooks, custom schema initialization | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/schema-options.md) |
| 🔐 **Authentication** | Dual-token JWT, 8 endpoints, cookie mode, revocation, OTP, per-route rate limiting ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/authentication.md) |
| 🛡️ **Authorization** | Ability predicates, `filter` vs `throw` mode | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/authorization.md) |
| ⚡ **Caching** | Global cache, auto-purge endpoint, `disableCache` option ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/caching.md) |
| ✅ **Validation** | `class-validator`, global + per-route `ValidationPipe`, DB-aware `@IsUnique`/`@EntityExists` ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/validation.md) |
| 📡 **WebSockets** | Socket.IO, room-targeted broadcast, `onConnection`, debug ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/websockets.md) |
| 🟢 **Presence** | Online/offline tracking, InMemory & Redis adapters ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/presence.md) |
| 🔁 **Callbacks** | `beforeSave`, `afterSave`, `beforeDelete`, typed contexts ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md) |
| 🔄 **Versioning** | URI-based API versioning | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/versioning.md) |
| 📚 **Swagger UI** | Auto-generated OpenAPI docs, visibility decorators | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/swagger-ui.md) |
| 🗂️ **Route Config** | DTOs, cascade delete (atomic ⭐), predicates, subPath, interceptors, `populate`, `auditLog` ⭐ *New* | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/route-config.md) |
| 🎛️ **Controller Config** | `forFeature` options, `customRoutes`, `extraProviders` ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/controller-config.md) |
| 🐞 **Debugging** | `MONGODB_DYNAMIC_API_LOGGER` levels, WS debug mode, where each log comes from ⭐ | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/debugging.md) |
| 🩺 **Health Check** | `GET /health` readiness probe, `DynamicApiHealthModule` ⭐ *New* | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/health-check.md) |
| 🧪 **Testing** | `createDynamicApiTestingApp`, in-memory MongoDB, zero Docker ⭐ *New* | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/testing.md) |
| 🏗️ **Schematics** | `nest g -c mongodb-dynamic-api resource <name>` — scaffold entity + module in one command ⭐ *New* | [View](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/schematics.md) |

> [!NOTE]
> **Key reminders:**
> - `BaseEntity` auto-enables timestamps — no `timestamps: true` needed in `@Schema()`
> - Soft delete: extend `SoftDeletableEntity` to get `isDeleted` + `deletedAt` fields
> - Version strings must be numeric (`'1'`, `'2'`), not semver
> - WebSocket auth event names are fixed: `auth-login`, `auth-register`, `auth-refresh-token`, `auth-logout`…
> - CRUD WS events auto-generated: `kebabCase(routeType + '/' + displayedName)`
> - Ability predicate signature: `(user, body?) => boolean` for auth, `(entity, user) => boolean` for CRUD

---

## License

MIT — see [LICENSE](LICENSE)

**Made with ❤️ by [Mickaël NODANCHE](https://cv-mikeonline.web.app)**
