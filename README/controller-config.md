[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

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
- [controllerOptions Reference](#controlleroptions-reference)
  - [path](#path)
  - [apiTag](#apitag)
  - [version](#version)
  - [isPublic](#ispublic)
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
  entity: Type<Entity>;                                    // Required
  controllerOptions: DynamicApiControllerOptions<Entity>;  // Required
  routes?: DynamicAPIRouteConfig<Entity>[];                // Optional — see route-config.md
  webSocket?: GatewayMetadata | boolean;                   // Optional — feature-level WS
  extraImports?: ModuleMetadata['imports'];                 // Optional — extra NestJS imports
  extraProviders?: ModuleMetadata['providers'];             // Optional — extra NestJS providers
  extraControllers?: ModuleMetadata['controllers'];         // Optional — extra NestJS controllers
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

> 📚 See [Route Configuration](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/route-config.md) for all route-level options.

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

> 📚 See [Versioning guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md) for full setup.

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

> 📚 See [Validation guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md) for full details.

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

> 📚 See [Authorization guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md) for full details.

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


