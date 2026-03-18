[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

> 🎛️ Looking for **controller-level** options (`path`, `apiTag`, `version`, `abilityPredicates`, `routesConfig`…)?  
> See [Controller Configuration](./controller-config.md).

---

# Route Configuration

Each route in `DynamicApiModule.forFeature` can be finely configured through the `DynamicAPIRouteConfig` interface. This page documents every available option, with a focus on **DTOs** and advanced customizations.

## 📋 Table of Contents

- [Route Types](#route-types)
- [Complete Configuration Reference](#complete-configuration-reference)
- [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
  - [DTOsBundle](#dtosbundle)
  - [query DTO](#query-dto)
  - [param DTO](#param-dto)
  - [body DTO](#body-dto)
  - [presenter DTO](#presenter-dto)
  - [Mappable Interface](#mappable-interface)
  - [Aggregatable Interface](#aggregatable-interface)
  - [DTO Compatibility by Route Type](#dto-compatibility-by-route-type)
- [Callbacks](#callbacks)
  - [beforeSaveCallback](#beforesavecallback)
  - [callback](#callback)
  - [CallbackMethods](#callbackmethods)
- [Other Options](#other-options)
  - [isPublic](#ispublic)
  - [disableCache](#disablecache)
  - [description](#description)
  - [version](#version)
  - [subPath](#subpath)
  - [validationPipeOptions](#validationpipeoptions)
  - [abilityPredicate](#abilitypredicate)
  - [isArrayResponse](#isarrayresponse)
  - [useInterceptors](#useinterceptors)
  - [webSocket](#websocket)
  - [eventName](#eventname)
  - [broadcast](#broadcast)
- [Examples](#examples)

---

## Route Types

The `type` field is **required** and must be one of the following values:

| Route Type | HTTP Method | Path | Description |
|---|---|---|---|
| `GetMany` | GET | `/:path` | Retrieve a list of documents |
| `GetOne` | GET | `/:path/:id` | Retrieve a single document by ID |
| `CreateMany` | POST | `/:path/many` | Create multiple documents at once |
| `CreateOne` | POST | `/:path` | Create a single document |
| `UpdateMany` | PATCH | `/:path/many` | Partially update multiple documents |
| `UpdateOne` | PATCH | `/:path/:id` | Partially update a single document |
| `ReplaceOne` | PUT | `/:path/:id` | Fully replace a single document |
| `DuplicateMany` | POST | `/:path/duplicate/many` | Duplicate multiple documents |
| `DuplicateOne` | POST | `/:path/duplicate/:id` | Duplicate a single document |
| `DeleteMany` | DELETE | `/:path/many` | Delete multiple documents by IDs |
| `DeleteOne` | DELETE | `/:path/:id` | Delete a single document |
| `Aggregate` | GET | `/:path/aggregate` | Execute a custom aggregation pipeline |

---

## Complete Configuration Reference

```typescript
interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  // Required
  type: RouteType;

  // DTOs
  dTOs?: {
    query?: Type;       // Query parameters DTO
    param?: Type;       // URL parameter DTO
    body?: Type;        // Request body DTO
    presenter?: Type;   // Response shape DTO
  };

  // Behavior
  isPublic?: boolean;                                     // Bypass authentication
  disableCache?: boolean;                                 // Disable cache for this route
  description?: string;                                   // Swagger operation summary
  version?: string;                                       // API version (e.g., '1', '2')
  subPath?: string;                                       // Additional path segment
  validationPipeOptions?: ValidationPipeOptions;          // Validation pipe configuration
  isArrayResponse?: boolean;                              // Force array response shape

  // Authorization
  abilityPredicate?: (entity: Entity, user: any) => boolean;

  // Callbacks
  beforeSaveCallback?: AnyBeforeSaveCallback<Entity>;
  callback?: AfterSaveCallback<Entity>;

  // Interceptors
  useInterceptors?: Type<NestInterceptor>[];

  // WebSocket
  webSocket?: GatewayMetadata | boolean;
  eventName?: string;
  broadcast?: {
    enabled: boolean | ((data: Entity, user: any) => boolean);
    eventName?: string;
  };
}
```

---

## DTOs (Data Transfer Objects)

DTOs allow you to customize the **shape of requests and responses** for each route. They are passed through the `dTOs` property as a `DTOsBundle` object.

### DTOsBundle

```typescript
type DTOsBundle = {
  query?: Type;     // Filters / query parameters
  param?: Type;     // URL path parameters
  body?: Type;      // Request body
  presenter?: Type; // Response body
};
```

Each field is optional. When omitted, the library falls back to a default shape derived from the entity.

---

### query DTO

Used to define the **query parameters** sent in GET requests. Mainly used by `GetMany` and `Aggregate`.

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SearchProductQuery {
  @ApiPropertyOptional({ example: 'laptop' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'GetMany',
      dTOs: { query: SearchProductQuery },
    },
  ],
})
```

> **Note:** For `Aggregate`, the `query` DTO **must** also implement the `Aggregatable` interface (see [below](#aggregatable-interface)).

---

### param DTO

Used to define **custom URL parameters** (beyond the default `:id`). Mainly useful for `GetOne` with custom param names.

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ProductSlugParam {
  @ApiProperty({ example: 'my-product-slug' })
  @IsString()
  slug: string;
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'GetOne',
      dTOs: { param: ProductSlugParam },
    },
  ],
})
```

---

### body DTO

Used to define the **request body** for write operations (`CreateOne`, `CreateMany`, `UpdateOne`, `UpdateMany`, `ReplaceOne`, `DuplicateOne`, `DuplicateMany`).

```typescript
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateProductBody {
  @ApiProperty({ example: 'Laptop Pro' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  price: number;
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'CreateOne',
      dTOs: { body: CreateProductBody },
    },
  ],
})
```

> **Note:** For `DuplicateOne` and `DuplicateMany`, the body is **optional** (the route can work without a body).

---

### presenter DTO

Used to define the **response shape** returned by the API. Applies to all route types.

```typescript
import { ApiProperty } from '@nestjs/swagger';

class ProductPresenter {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Laptop Pro' })
  name: string;

  @ApiProperty({ example: 999.99 })
  price: number;

  // Intentionally omit internal fields like __v, _id
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'GetOne',
      dTOs: { presenter: ProductPresenter },
    },
    {
      type: 'CreateOne',
      dTOs: { presenter: ProductPresenter },
    },
  ],
})
```

---

### Mappable Interface

The `Mappable` interface enables **custom mapping logic** between DTOs and entities. Implement it on a DTO class to control serialization and deserialization.

```typescript
interface Mappable<Entity> {
  // Map a request DTO to a partial entity (used by body DTOs)
  toEntity?: <DTO = any>(body: DTO) => Partial<Entity>;

  // Map multiple request DTOs to partial entities (used by CreateMany body)
  toEntities?: <DTO = any>(body: DTO) => Partial<Entity>[];

  // Map a delete result to a custom response (used by presenter of Delete routes)
  fromDeleteResult?: <Presenter = any>(result: DeleteResult) => Presenter;

  // Map a single entity to a custom presenter (used by presenter DTOs)
  fromEntity?: <Presenter = any>(entity: Entity) => Presenter;

  // Map multiple entities to custom presenters (used by presenter DTOs for array responses)
  fromEntities?: <Presenter = any>(entities: Entity[]) => Presenter[];

  // Map aggregate results to a custom presenter (used by presenter of Aggregate route)
  fromAggregate?: <Presenter = any>(
    entities: Entity[],
    count: number,
    totalPage: number,
  ) => Presenter;
}
```

**Example — Custom body-to-entity mapping:**

```typescript
class CreateProductBody implements Mappable<Product> {
  @ApiProperty()
  @IsNotEmpty()
  title: string; // Different name than the entity field

  @ApiProperty()
  @IsNumber()
  amount: number; // Different name than the entity field

  // Map the DTO to the entity shape
  static toEntity(body: CreateProductBody): Partial<Product> {
    return {
      name: body.title,
      price: body.amount,
    };
  }
}
```

**Example — Custom entity-to-presenter mapping:**

```typescript
class ProductPresenter implements Mappable<Product> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string; // Renamed from 'name'

  @ApiProperty()
  formattedPrice: string; // Computed field

  static fromEntity(product: Product): ProductPresenter {
    return {
      id: product.id,
      label: product.name,
      formattedPrice: `$${product.price.toFixed(2)}`,
    };
  }
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'GetOne',
      dTOs: { presenter: ProductPresenter },
    },
  ],
})
```

---

### Aggregatable Interface

The `Aggregatable` interface is **required** for the `Aggregate` route type. It defines the `toPipeline` method that converts a query DTO into a MongoDB aggregation pipeline.

```typescript
interface Aggregatable<Query> {
  toPipeline?: (query: Query) => PipelineStage[];
}
```

**Example:**

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Aggregatable } from 'mongodb-dynamic-api';

class ProductStatsQuery implements Aggregatable<ProductStatsQuery> {
  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  // Required: converts this query to a MongoDB aggregation pipeline
  static toPipeline(query: ProductStatsQuery) {
    return [
      ...(query.category ? [{ $match: { category: query.category } }] : []),
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          avgPrice: { $avg: '$price' },
        },
      },
    ];
  }
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'Aggregate',
      dTOs: { query: ProductStatsQuery },
    },
  ],
})
```

---

### DTO Compatibility by Route Type

| Route Type | `query` | `param` | `body` | `presenter` |
|---|:---:|:---:|:---:|:---:|
| `GetMany` | ✅ | ❌ | ❌ | ✅ |
| `GetOne` | ❌ | ✅ | ❌ | ✅ |
| `CreateMany` | ❌ | ❌ | ✅ | ✅ |
| `CreateOne` | ❌ | ❌ | ✅ | ✅ |
| `UpdateMany` | ❌ | ❌ | ✅ | ✅ |
| `UpdateOne` | ❌ | ❌ | ✅ | ✅ |
| `ReplaceOne` | ❌ | ❌ | ✅ | ✅ |
| `DuplicateMany` | ❌ | ❌ | ✅ *(optional)* | ✅ |
| `DuplicateOne` | ❌ | ❌ | ✅ *(optional)* | ✅ |
| `DeleteMany` | ❌ | ❌ | ❌ | ✅ |
| `DeleteOne` | ❌ | ❌ | ❌ | ✅ |
| `Aggregate` | ✅ *(required + `toPipeline`)* | ❌ | ❌ | ✅ |

---

## Callbacks

Callbacks let you hook into the lifecycle of a service operation, either **before saving** (to transform data) or **after the operation** (to trigger side effects).

### beforeSaveCallback

Executed **before a document is saved** to the database. Use it to transform or enrich the data.

There are **four callback signatures** depending on the route type:

#### BeforeSaveCallback (single-document write routes)

Used by: `CreateOne`, `UpdateOne`, `ReplaceOne`, `DuplicateOne`

```typescript
type BeforeSaveCallback<Entity, Context> = (
  entity: Entity | undefined,  // Existing document (undefined on create)
  context: Context,            // Operation context (see below)
  methods: CallbackMethods,
) => Promise<Partial<Entity>>;
```

#### BeforeSaveListCallback (multi-document write routes)

Used by: `CreateMany`, `UpdateMany`, `DuplicateMany`

```typescript
type BeforeSaveListCallback<Entity, Context> = (
  entities: Entity[] | undefined,  // Existing documents (undefined on CreateMany, entities before modification on UpdateMany/DuplicateMany)
  context: Context,
  methods: CallbackMethods,
) => Promise<Partial<Entity>[]>;
```

#### BeforeSaveDeleteCallback (single-document delete route)

Used by: `DeleteOne`

```typescript
type BeforeSaveDeleteCallback<Entity, Context> = (
  entity: Entity | undefined,  // Existing document if found
  context: Context,
  methods: CallbackMethods,
) => Promise<void>;
```

#### BeforeSaveDeleteManyCallback (multi-document delete route)

Used by: `DeleteMany`

```typescript
type BeforeSaveDeleteManyCallback<Entity, Context> = (
  entities: Entity[],          // Found documents to delete
  context: Context,
  methods: CallbackMethods,
) => Promise<void>;
```

#### Context types

Each route type receives a specific context object:

**`CreateOne`:**

```typescript
type BeforeSaveCreateContext<Entity> = {
  toCreate: Partial<Entity>;
};
```

**`CreateMany`:**

```typescript
type BeforeSaveCreateManyContext<Entity> = {
  toCreate: Partial<Entity>[];
};
```

**`UpdateOne`:**

```typescript
type BeforeSaveUpdateContext<Entity> = {
  id: string;
  update: Partial<Entity>;
};
```

**`UpdateMany`:**

```typescript
type BeforeSaveUpdateManyContext<Entity> = {
  ids: string[];
  update: Partial<Entity>;
};
```

**`ReplaceOne`:**

```typescript
type BeforeSaveReplaceContext<Entity> = {
  id: string;
  replacement: Partial<Entity>;
};
```

**`DeleteOne`:**

```typescript
type BeforeSaveDeleteContext = {
  id: string;
};
```

**`DeleteMany`:**

```typescript
type BeforeSaveDeleteManyContext = {
  ids: string[];
};
```

**`DuplicateOne`:**

```typescript
type BeforeSaveDuplicateContext<Entity> = {
  id: string;
  override?: Partial<Entity>;
};
```

**`DuplicateMany`:**

```typescript
type BeforeSaveDuplicateManyContext<Entity> = {
  ids: string[];
  override?: Partial<Entity>;
};
```

> **💡 Note:** All these types are exported from `mongodb-dynamic-api` and can be imported directly.

#### Deprecated aliases

The following verbose names are still exported for backward compatibility but are **deprecated** and will be removed in v5:

| Deprecated name | Replacement |
|---|---|
| `DynamicApiServiceBeforeSaveCallback` | `BeforeSaveCallback` |
| `DynamicApiServiceBeforeSaveListCallback` | `BeforeSaveListCallback` |
| `DynamicApiServiceBeforeSaveDeleteCallback` | `BeforeSaveDeleteCallback` |
| `DynamicApiServiceBeforeSaveDeleteManyCallback` | `BeforeSaveDeleteManyCallback` |
| `DynamicApiServiceBeforeSaveCreateContext` | `BeforeSaveCreateContext` |
| `DynamicApiServiceBeforeSaveCreateManyContext` | `BeforeSaveCreateManyContext` |
| `DynamicApiServiceBeforeSaveUpdateContext` | `BeforeSaveUpdateContext` |
| `DynamicApiServiceBeforeSaveUpdateManyContext` | `BeforeSaveUpdateManyContext` |
| `DynamicApiServiceBeforeSaveReplaceContext` | `BeforeSaveReplaceContext` |
| `DynamicApiServiceBeforeSaveDeleteContext` | `BeforeSaveDeleteContext` |
| `DynamicApiServiceBeforeSaveDeleteManyContext` | `BeforeSaveDeleteManyContext` |
| `DynamicApiServiceBeforeSaveDuplicateContext` | `BeforeSaveDuplicateContext` |
| `DynamicApiServiceBeforeSaveDuplicateManyContext` | `BeforeSaveDuplicateManyContext` |

**Example — Hash a password before saving:**

```typescript
import * as bcrypt from 'bcrypt';

DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: { path: 'users' },
  routes: [
    {
      type: 'CreateOne',
      beforeSaveCallback: async (entity, context, methods) => {
        const { toCreate } = context as BeforeSaveCreateContext<User>;
        if (toCreate.password) {
          toCreate.password = await bcrypt.hash(toCreate.password, 10);
        }
        return toCreate;
      },
    },
    {
      type: 'UpdateOne',
      beforeSaveCallback: async (entity, context, methods) => {
        const { update } = context as BeforeSaveUpdateContext<User>;
        if (update.password) {
          update.password = await bcrypt.hash(update.password, 10);
        }
        return update;
      },
    },
  ],
})
```

---

### callback

Executed **after a successful operation** (save, delete, etc.). Use it to trigger side effects like sending notifications or invalidating a cache.

**Signature:**

```typescript
type AfterSaveCallback<Entity> = (
  entity: Entity,
  methods: CallbackMethods,
) => Promise<void>;
```

> **💡 Note:** The deprecated alias `DynamicApiServiceCallback` is still exported for backward compatibility but will be removed in v5. Use `AfterSaveCallback` instead.

**Example — Send a notification after creation:**

```typescript
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: { path: 'orders' },
  routes: [
    {
      type: 'CreateOne',
      callback: async (order, methods) => {
        // Send confirmation email
        await sendOrderConfirmation(order.id, order.userEmail);

        // Create a notification document in another collection
        await methods.createOneDocument(Notification, {
          userId: order.userId,
          message: `Order ${order.id} confirmed`,
        });
      },
    },
  ],
})
```

---

### CallbackMethods

Both `beforeSaveCallback` and `callback` receive a `methods` object with database helpers:

```typescript
type CallbackMethods = {
  findManyDocuments<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]>;
  findOneDocument<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T | undefined>;
  createManyDocuments<T>(entity: Type<T>, data: Partial<T>[]): Promise<T[]>;
  createOneDocument<T>(entity: Type<T>, data: Partial<T>): Promise<T>;
  updateManyDocuments<T>(
    entity: Type<T>,
    query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult>;
  updateOneDocument<T>(
    entity: Type<T>,
    query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult>;
  deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult>;
  deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult>;
  aggregateDocuments<T>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]>;
};
```

> **💡 Note:** The deprecated alias `DynamicApiCallbackMethods` is still exported for backward compatibility but will be removed in v5. Use `CallbackMethods` instead.

---

## Other Options

### isPublic

Marks the route as **publicly accessible**, bypassing JWT authentication even when authentication is globally enabled.

```typescript
routes: [
  {
    type: 'GetMany',
    isPublic: true, // Anyone can list products without a token
  },
  {
    type: 'CreateOne',
    // isPublic not set → requires authentication
  },
]
```

> Also configurable at the controller level via `controllerOptions.isPublic`.

---

### disableCache

Disables caching for this specific **read** route (GetMany, GetOne, Aggregate). When set to `true`, the response will never be cached. When set to `false`, it explicitly re-enables caching even if the controller has `disableCache: true`.

Has no effect on write routes (POST, PUT, PATCH, DELETE) — they are never cached, only auto-purge.

```typescript
routes: [
  {
    type: 'GetMany',
    disableCache: true, // This list is never cached
  },
  {
    type: 'GetOne',
    // disableCache not set → inherits controller setting (or default: enabled)
  },
]
```

> Also configurable at the controller level via `controllerOptions.disableCache`. Route-level takes precedence.
>
> 📚 See [Caching guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/caching.md) for full details on priority resolution and cache purge.

---

### description

Custom summary shown in the **Swagger UI** for the operation. Overrides the auto-generated description.

```typescript
routes: [
  {
    type: 'GetMany',
    description: 'Returns a paginated list of available products',
  },
]
```

---

### version

Override the **API version** for this specific route (overrides `controllerOptions.version`). Must be a numeric string (`'1'`, `'2'`, etc.).

```typescript
routes: [
  {
    type: 'GetMany',
    version: '1', // Accessible at GET /v1/products
  },
  {
    type: 'CreateOne',
    version: '2', // Accessible at POST /v2/products
  },
]
```

---

### subPath

Adds an **additional path segment** to the route, creating a sub-route under the main controller path.

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'GetMany',
      subPath: 'featured', // Accessible at GET /products/featured
    },
    {
      type: 'GetMany',
      // No subPath → accessible at GET /products
    },
  ],
})
```

---

### validationPipeOptions

Override the **validation pipe configuration** for this specific route (overrides `controllerOptions.validationPipeOptions`). Accepts any `ValidationPipeOptions` from `@nestjs/common`.

```typescript
routes: [
  {
    type: 'CreateOne',
    validationPipeOptions: {
      whitelist: true,            // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true,            // Auto-transform types
    },
  },
]
```

---

### abilityPredicate

A function that determines whether the **authenticated user** has access to a specific document returned or targeted by this route.

**Signature:** `(entity: Entity, user: any) => boolean`

```typescript
routes: [
  {
    type: 'UpdateOne',
    // Only the owner or an admin can update
    abilityPredicate: (product, user) =>
      product.ownerId === user.id || user.role === 'admin',
  },
  {
    type: 'DeleteOne',
    // Only admins can delete
    abilityPredicate: (product, user) => user.role === 'admin',
  },
]
```

> Also configurable at the controller level via `controllerOptions.abilityPredicates`. The route-level predicate takes precedence.

---

### isArrayResponse

Forces the route to return an **array response shape** even when the default response is a single object (useful for custom `Aggregate` presenters).

```typescript
routes: [
  {
    type: 'Aggregate',
    dTOs: { query: ProductStatsQuery, presenter: ProductStatsPresenter },
    isArrayResponse: true, // Response will be wrapped as an array
  },
]
```

---

### useInterceptors

An array of **NestJS interceptors** to apply specifically to this route (overrides `controllerOptions.useInterceptors`).

```typescript
import { LoggingInterceptor, RateLimitInterceptor } from './interceptors';

routes: [
  {
    type: 'CreateOne',
    useInterceptors: [LoggingInterceptor, RateLimitInterceptor],
  },
]
```

---

### webSocket

Exposes the route **via WebSocket** in addition to HTTP (or exclusively via WS). Accepts `true` for default gateway options, or a `GatewayMetadata` object for custom configuration.

```typescript
routes: [
  {
    type: 'CreateOne',
    webSocket: true, // Also expose as WS event
  },
  {
    type: 'GetMany',
    webSocket: {
      namespace: '/products',
      cors: { origin: '*' },
    },
  },
]
```

---

### eventName

Custom **WebSocket event name** for this route (overrides the auto-generated name based on route type and entity).

Default format: `kebab-case(routeType/EntityName)` → e.g., `create-one/product`

```typescript
routes: [
  {
    type: 'CreateOne',
    webSocket: true,
    eventName: 'product:create', // Custom WS event name
  },
]
```

---

### broadcast

Broadcasts the operation result to **all connected WebSocket clients** after an HTTP operation completes. Useful for real-time updates.

```typescript
interface DynamicApiBroadcastConfig<Entity> {
  enabled: boolean | ((data: Entity, user: any) => boolean);
  eventName?: string; // Defaults to the WS event name pattern
}
```

```typescript
routes: [
  {
    type: 'CreateOne',
    broadcast: {
      enabled: true, // Broadcast to all WS clients after POST
      eventName: 'product:created',
    },
  },
  {
    type: 'DeleteOne',
    broadcast: {
      // Only broadcast if an admin performed the deletion
      enabled: (product, user) => user?.role === 'admin',
    },
  },
]
```

---

## Examples

### Complete Route Configuration

```typescript
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { Product } from './product.entity';
import { 
  SearchProductQuery,
  CreateProductBody,
  UpdateProductBody,
  ProductPresenter,
  ProductStatsQuery,
} from './dtos';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        version: '1',
        validationPipeOptions: { whitelist: true, transform: true },
      },
      routes: [
        // Public listing with custom query DTO and presenter
        {
          type: 'GetMany',
          isPublic: true,
          description: 'Browse the product catalog',
          dTOs: {
            query: SearchProductQuery,
            presenter: ProductPresenter,
          },
        },

        // Public single product view
        {
          type: 'GetOne',
          isPublic: true,
          dTOs: { presenter: ProductPresenter },
        },

        // Admin-only creation with custom body, presenter, and notification callback
        {
          type: 'CreateOne',
          dTOs: {
            body: CreateProductBody,
            presenter: ProductPresenter,
          },
          abilityPredicate: (product, user) => user.role === 'admin',
          callback: async (product, methods) => {
            await methods.createOneDocument(AuditLog, {
              action: 'CREATE',
              entityId: product.id,
              entityType: 'Product',
            });
          },
          broadcast: {
            enabled: true,
            eventName: 'product:created',
          },
        },

        // Owner or admin can update, with password hashing if needed
        {
          type: 'UpdateOne',
          dTOs: {
            body: UpdateProductBody,
            presenter: ProductPresenter,
          },
          abilityPredicate: (product, user) =>
            product.ownerId === user.id || user.role === 'admin',
          beforeSaveCallback: async (entity, context, methods) => {
            const { update } = context as BeforeSaveUpdateContext<Product>;
            // Normalize price before saving
            if (update.price) {
              update.price = Math.round(update.price * 100) / 100;
            }
            return update;
          },
        },

        // Admin-only deletion with broadcast
        {
          type: 'DeleteOne',
          abilityPredicate: (product, user) => user.role === 'admin',
          broadcast: {
            enabled: (product, user) => user?.role === 'admin',
            eventName: 'product:deleted',
          },
        },

        // Sub-path route for featured products
        {
          type: 'GetMany',
          subPath: 'featured',
          description: 'Get featured products',
          isPublic: true,
          dTOs: { presenter: ProductPresenter },
        },

        // Custom aggregation with version override
        {
          type: 'Aggregate',
          version: '2',
          description: 'Get product statistics by category',
          dTOs: {
            query: ProductStatsQuery, // Must implement Aggregatable
            presenter: ProductStatsPresenter,
          },
          isArrayResponse: true,
          isPublic: true,
        },
      ],
    }),
  ],
})
export class ProductsModule {}
```

### All DTOs for one route

```typescript
// dtos/search-product.query.ts
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProductQuery {
  @ApiPropertyOptional({ example: 'laptop' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(100000)
  maxPrice?: number;
}

// dtos/create-product.body.ts
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Mappable } from 'mongodb-dynamic-api';
import { Product } from '../product.entity';

export class CreateProductBody implements Mappable<Product> {
  @ApiProperty({ example: 'Laptop Pro' })
  @IsNotEmpty()
  @IsString()
  title: string; // Maps to Product.name

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  amount: number; // Maps to Product.price

  static toEntity(body: CreateProductBody): Partial<Product> {
    return {
      name: body.title,
      price: body.amount,
    };
  }
}

// dtos/product.presenter.ts
import { ApiProperty } from '@nestjs/swagger';
import { Mappable } from 'mongodb-dynamic-api';
import { Product } from '../product.entity';

export class ProductPresenter implements Mappable<Product> {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Laptop Pro' })
  label: string;

  @ApiProperty({ example: '$999.99' })
  formattedPrice: string;

  static fromEntity(product: Product): ProductPresenter {
    return {
      id: product.id,
      label: product.name,
      formattedPrice: `$${product.price.toFixed(2)}`,
    };
  }

  static fromEntities(products: Product[]): ProductPresenter[] {
    return products.map(ProductPresenter.fromEntity);
  }
}

// dtos/product-stats.query.ts (for Aggregate route)
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Aggregatable } from 'mongodb-dynamic-api';

export class ProductStatsQuery implements Aggregatable<ProductStatsQuery> {
  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  static toPipeline(query: ProductStatsQuery) {
    return [
      ...(query.category ? [{ $match: { category: query.category } }] : []),
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
        },
      },
      { $sort: { count: -1 } },
    ];
  }
}
```


