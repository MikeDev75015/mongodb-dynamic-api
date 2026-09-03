[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

> 🎛️ Looking for **controller-level** options (`path`, `apiTag`, `version`, `abilityPredicates`, `routesConfig`…)?  
> See [Controller Configuration](./controller-config.md).

---

# Route Configuration

Each route in `DynamicApiModule.forFeature` can be finely configured through the `DynamicApiRouteConfig` interface. This page documents every available option, with a focus on **DTOs** and advanced customizations.

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
    - [Paginating an Aggregate route — PagingQuery + parsePagingParams](#paginating-an-aggregate-route--pagingquery--parsepagingparams)
  - [DTO Compatibility by Route Type](#dto-compatibility-by-route-type)
- [Callbacks](#callbacks) — [📚 Full Callbacks Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md)
  - [beforeSaveCallback](#beforesavecallback)
  - [beforeDeleteCallback](#beforedeletecallback)
  - [callback (afterSave)](#callback-aftersave)
  - [CallbackMethods](#callbackmethods)
- [Cascade Delete](#cascade-delete)
  - [CascadeConfig](#cascadeconfig)
  - [Cascade + Soft Delete](#cascade--soft-delete)
  - [Atomicity](#atomicity) ⭐ *New*
- [Audit Log](#audit-log) ⭐ *New*
- [Other Options](#other-options)
  - [isPublic](#ispublic)
  - [disableCache](#disablecache)
  - [description](#description)
  - [version](#version)
  - [subPath](#subpath)
  - [validationPipeOptions](#validationpipeoptions)
  - [populate](#populate) ⭐ *New*
  - [abilityPredicate](#abilitypredicate)
  - [predicateBehavior](#predicatebehavior)
  - [isArrayResponse](#isarrayresponse)
  - [useInterceptors](#useinterceptors)
  - [fromUser](#fromuser)
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
interface DynamicApiRouteConfig<Entity extends BaseEntity> {
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

  // Relations (GetOne / GetMany only)
  populate?: string | PopulateOptions | (string | PopulateOptions)[];

  // Authorization
  abilityPredicate?: (entity: Entity, user: any) => boolean;
  predicateBehavior?: 'filter' | 'throw'; // Only for GetMany and Aggregate

  // Callbacks
  beforeSaveCallback?: BeforeSaveCallback<Entity, Context>; // exact signature narrowed per route type — see below
  /**
   * Pre-delete hook for DeleteOne / DeleteMany routes only.
   * Runs BEFORE the MongoDB delete and OUTSIDE the internal error-catch block:
   * any exception thrown propagates as a proper HTTP error and aborts the delete.
   */
  beforeDeleteCallback?: AnyBeforeDeleteCallback<Entity>;
  callback?: AfterSaveCallback<Entity>;

  // Audit log (mutation routes only — no effect on GetOne / GetMany / Aggregate)
  auditLog?: boolean;

  // Cascade (DeleteOne / DeleteMany only)
  cascade?: CascadeConfig[];

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

#### Paginating an `Aggregate` route — `PagingQuery` + `parsePagingParams`

A `.Paging()`-built pipeline needs a `page`/`pageSize` pair, clamped to sane bounds, in every query
DTO. `PagingQuery` (extend it instead of redeclaring the two fields) and `parsePagingParams` (the
clamp logic — `page >= 1`, `1 <= pageSize <= maxPageSize`, a missing/non-numeric value falls back
to a default) are exported so you don't have to reimplement either per entity:

```typescript
import { PagingQuery, parsePagingParams } from 'mongodb-dynamic-api';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';

class ProductStatsQuery extends PagingQuery {
  static toPipeline(query: ProductStatsQuery): PipelineStage[] {
    const { page, pageSize } = parsePagingParams(query, { defaultPageSize: 20, maxPageSize: 100 });

    return new PipelineBuilder('product-stats')
      .Sort({ createdAt: -1 })
      .Paging(pageSize, page)
      .build();
  }
}
```

> ⚠️ **A `.Paging()` pipeline only returns `{ list, count, totalPage }` when the route's presenter
> implements `fromAggregate`** — without one, the response silently falls back to the raw `list`
> array and `count`/`totalPage` are dropped (a warning is logged via
> [`MONGODB_DYNAMIC_API_LOGGER`](./debugging.md) when this happens, but the response shape itself
> doesn't change — flipping the default would be a breaking change for routes relying on the plain
> array today). Always pair a `.Paging()` query DTO with a presenter that has `fromAggregate`, as
> in the [presenter DTO](#presenter-dto) example above.
>
> The generated Swagger doc follows the same rule: as soon as the route's presenter implements
> `fromAggregate`, `ApiResponse` documents the real `{ list: Presenter[], count: number, totalPage:
> number }` shape (via an auto-generated `Paginated<Presenter>` wrapper schema) instead of a bare
> `Presenter`/`Presenter[]` — so OpenAPI clients generated against the route get the correct type.

`parsePagingParams(query, options?)`:

| Option | Default | Description |
|---|---|---|
| `defaultPageSize` | `20` | Used when `query.pageSize` is missing. |
| `maxPageSize` | `100` | Upper bound `pageSize` is clamped to, regardless of what the caller requested. |

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

Callbacks let you hook into the lifecycle of a service operation, either **before saving** (to transform data) or **after the operation** (to trigger side effects). Both callbacks receive the **authenticated user** when auth is enabled.

> 📚 **Full documentation:** See the dedicated [**Callbacks guide**](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md) for complete reference, all signatures, typed contexts, user access, and real-world examples.

### Quick Reference

| Property | Hook point | Purpose |
|---|---|---|
| `beforeSaveCallback` | Before the DB write | Transform / enrich / validate data |
| `callback` | After a successful operation | Side effects (audit, notification, cross-collection write) |

### beforeSaveCallback

`DynamicApiRouteConfig` is a **discriminated union** — TypeScript narrows `beforeSaveCallback` to the exact context type for each `type` discriminant. No cast is ever needed in application code.

| Route type | Config type | Callback type | Context type | Returns |
|---|---|---|---|---|
| `CreateOne` | `CreateOneRouteConfig<E>` | `BeforeSaveCallback<E, BeforeSaveCreateContext<E>>` | `BeforeSaveCreateContext<E, BodyDTO>` | `Partial<E>` |
| `CreateMany` | `CreateManyRouteConfig<E>` | `BeforeSaveListCallback<E, BeforeSaveCreateManyContext<E>>` | `BeforeSaveCreateManyContext<E, BodyDTO>` | `Partial<E>[]` |
| `UpdateOne` | `UpdateOneRouteConfig<E>` | `BeforeSaveCallback<E, BeforeSaveUpdateContext<E>>` | `BeforeSaveUpdateContext<E, BodyDTO>` | `Partial<E>` |
| `UpdateMany` | `UpdateManyRouteConfig<E>` | `BeforeSaveListCallback<E, BeforeSaveUpdateManyContext<E>>` | `BeforeSaveUpdateManyContext<E, BodyDTO>` | `Partial<E>[]` |
| `ReplaceOne` | `ReplaceOneRouteConfig<E>` | `BeforeSaveCallback<E, BeforeSaveReplaceContext<E>>` | `BeforeSaveReplaceContext<E, BodyDTO>` | `Partial<E>` |
| `DuplicateOne` | `DuplicateOneRouteConfig<E>` | `BeforeSaveCallback<E, BeforeSaveDuplicateContext<E>>` | `BeforeSaveDuplicateContext<E, BodyDTO>` | `Partial<E>` |
| `DuplicateMany` | `DuplicateManyRouteConfig<E>` | `BeforeSaveListCallback<E, BeforeSaveDuplicateManyContext<E>>` | `BeforeSaveDuplicateManyContext<E, BodyDTO>` | `Partial<E>[]` |
| `DeleteOne` | `DeleteOneRouteConfig<E>` | `BeforeSaveDeleteCallback<E, BeforeSaveDeleteContext>` | `BeforeSaveDeleteContext` | `void` |
| `DeleteMany` | `DeleteManyRouteConfig<E>` | `BeforeSaveDeleteManyCallback<E, BeforeSaveDeleteManyContext>` | `BeforeSaveDeleteManyContext` | `void` |
| `GetOne` | `GetOneRouteConfig<E>` | — *(no beforeSaveCallback)* | — | — |
| `GetMany` | `GetManyRouteConfig<E>` | — *(no beforeSaveCallback)* | — | — |
| `Aggregate` | `AggregateRouteConfig<E>` | — *(no beforeSaveCallback)* | — | — |
| `Custom` | `CustomOperationRouteConfig<E>` | — *(no beforeSaveCallback)* | — | — |

> **`beforeDeleteCallback` and `cascade`** are only available on `DeleteOneRouteConfig` and `DeleteManyRouteConfig`.

Each route provides a typed context (`BeforeSaveCreateContext`, `BeforeSaveUpdateContext`, etc.) and the authenticated `user` as the last parameter. The `User` generic defaults to `unknown` — pass your user entity type for full type safety (see [Callbacks guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md#typing-the-user-parameter)).

Context types accept an optional **`BodyDTO` generic** (defaults to `Entity`). Pass your custom body DTO class when using `dTOs.body` to get full type safety on the body fields (see [Custom Body DTO](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md#custom-body-dto--bodydto-generic)).

**Example — Hash a password before saving (typed context, no cast):**

```typescript
import * as bcrypt from 'bcrypt';
import { BeforeSaveCallback, BeforeSaveCreateContext } from 'mongodb-dynamic-api';

class CreateUserDto {
  email: string;
  password: string;
  displayName?: string;
}

// ✅ ctx.toCreate is Partial<User> — TS narrows automatically via discriminant type: 'CreateOne'
const beforeCreate: BeforeSaveCallback<User, BeforeSaveCreateContext<User>> =
  async (_entity, ctx, _methods, _user) => {
    if (ctx.toCreate.password) {
      ctx.toCreate.password = await bcrypt.hash(ctx.toCreate.password, 10);
    }
    return ctx.toCreate;
  };

DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: { path: 'users' },
  routes: [
    {
      type: 'CreateOne',
      dTOs: { body: CreateUserDto },
      beforeSaveCallback: beforeCreate,
    },
  ],
})
```

### callback (afterSave)

---

### beforeDeleteCallback

> **Compatible routes:** `DeleteOne`, `DeleteMany` only.

A pre-delete hook that runs **before** the MongoDB delete operation and **outside** the internal error-catch block. This means any exception you throw (e.g. `ForbiddenException`, `BadRequestException`) propagates cleanly to the client as an HTTP error and **aborts** the delete.

**Key difference vs `beforeSaveCallback`:** `beforeSaveCallback` on delete routes was silently swallowing exceptions (returning `{ deletedCount: 0 }` instead of an HTTP error). `beforeDeleteCallback` is the recommended hook for delete guard/validation logic.

#### Signatures

```typescript
import {
  BeforeDeleteCallback,
  BeforeDeleteManyCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
  CallbackMethods,
} from 'mongodb-dynamic-api';

// DeleteOne
type BeforeDeleteCallback<Entity, Context = BeforeSaveDeleteContext, User = unknown> = (
  entity: Entity | undefined,        // current document (undefined if not found)
  context: { id: string },
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

// DeleteMany
type BeforeDeleteManyCallback<Entity, Context = BeforeSaveDeleteManyContext, User = unknown> = (
  entities: Entity[],                // matched documents (empty array if none found)
  context: { ids: string[] },
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```

#### Example — block deletion based on business rule

```typescript
import {
  BaseEntity,
  BeforeDeleteCallback,
  BeforeSaveDeleteContext,
  CallbackMethods,
  DynamicApiModule,
} from 'mongodb-dynamic-api';
import { ForbiddenException } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ collection: 'posts' })
class PostEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Boolean, default: false })
  pinned: boolean;
}

const blockPinnedPostDeletion: BeforeDeleteCallback<PostEntity, BeforeSaveDeleteContext> =
  async (post, _context, _methods) => {
    if (post?.pinned) {
      throw new ForbiddenException('Pinned posts cannot be deleted');
    }
  };

DynamicApiModule.forFeature({
  entity: PostEntity,
  controllerOptions: { path: 'posts' },
  routes: [
    {
      type: 'DeleteOne',
      beforeDeleteCallback: blockPinnedPostDeletion,
    },
  ],
});
```

---

### callback (afterSave)

```typescript
type AfterSaveCallback<Entity, User = unknown> = (
  entity: Entity,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```


Available on **all** route types (including `GetOne` and `GetMany`). For list routes, called **once per entity**. The `User` generic defaults to `unknown` — pass your user entity type for full type safety.

**Example — Audit log with typed user:**

```typescript
import { AfterSaveCallback } from 'mongodb-dynamic-api';

DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: { path: 'orders' },
  routes: [
    {
      type: 'CreateOne',
      callback: async (order, methods, user?) => {
        const u = user as UserEntity | undefined;
        await methods.createOneDocument(AuditLog, {
          action: 'OrderCreated',
          entityId: order.id,
          performedBy: u?.email ?? 'anonymous',
        });
      },
    },
  ],
})

// Or with the User generic for full type safety:
const onOrderCreated: AfterSaveCallback<Order, UserEntity> =
  async (order, methods, user) => {
    // user is UserEntity | undefined — no cast needed
    await methods.createOneDocument(AuditLog, {
      action: 'OrderCreated',
      entityId: order.id,
      performedBy: user?.email ?? 'anonymous',
    });
  };
```

### CallbackMethods

Both `beforeSaveCallback` and `callback` receive a `methods` object with database helpers for **any collection**:

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

> 📚 See the [**Callbacks guide**](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/callbacks.md) for typed contexts per route, authenticated user access in HTTP & WebSocket, ownership stamping, audit trails, and more examples.

---

---

## Cascade Delete

The `cascade` option lets you **automatically delete child documents** when a parent document is deleted. It is available on `DeleteOne` and `DeleteMany` routes.

### CascadeConfig

```typescript
import { CascadeConfig } from 'mongodb-dynamic-api';

interface CascadeConfig {
  /**
   * The child entity class whose documents will be deleted.
   */
  entity: Type<BaseEntity>;

  /**
   * The field name on the child entity that references the parent document's ID.
   */
  foreignKey: string;

  /**
   * When to trigger the cascade:
   * - 'delete'     — when the parent is hard-deleted (entity is NOT soft-deletable)
   * - 'softDelete' — when the parent is soft-deleted (entity IS soft-deletable).
   *                  Only triggered when `isSoftDeletable === true` on the parent service.
   */
  on: 'delete' | 'softDelete';

  /**
   * Controls how child documents are deleted:
   * - true      → always soft-delete children (sets isDeleted + deletedAt)
   * - false     → always hard-delete children
   * - undefined → mirror parent: soft children when parent was soft-deleted,
   *               hard children when parent was hard-deleted (default)
   */
  softDelete?: boolean;
}
```

| Property | Required | Description |
|---|---|---|
| `entity` | ✅ | Child entity class registered with `DynamicApiModule.forFeature` |
| `foreignKey` | ✅ | Field on the child that holds the parent ID |
| `on` | ✅ | `'delete'` or `'softDelete'` — controls when the cascade fires |
| `softDelete` | ❌ | Override soft/hard delete for children (default: mirror parent) |

> **Important:** The child entity must be registered with `DynamicApiModule.forFeature` (even with `routes: []`) so its schema is available for model resolution.

#### Example — hard-delete comments when a post is hard-deleted

```typescript
import {
  BaseEntity,
  CascadeConfig,
  DynamicApiModule,
} from 'mongodb-dynamic-api';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ collection: 'posts' })
class PostEntity extends BaseEntity {
  @Prop({ type: String, required: true }) title: string;
}

@Schema({ collection: 'comments' })
class CommentEntity extends BaseEntity {
  @Prop({ type: String, required: true }) postId: string;
  @Prop({ type: String, required: true }) body: string;
}

const cascade: CascadeConfig[] = [
  { entity: CommentEntity, foreignKey: 'postId', on: 'delete' },
];

DynamicApiModule.forFeature({
  entity: PostEntity,
  controllerOptions: { path: 'posts' },
  routes: [
    { type: 'DeleteOne', cascade },
    { type: 'DeleteMany', cascade },
  ],
  // Register child entity schema so it can be resolved
  extraImports: [
    DynamicApiModule.forFeature({
      entity: CommentEntity,
      controllerOptions: { path: 'comments' },
      routes: [],
    }),
  ],
});
```

### Cascade + Soft Delete

```typescript
import { SoftDeletableEntity } from 'mongodb-dynamic-api';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ collection: 'soft-posts' })
class SoftPost extends SoftDeletableEntity {
  @Prop({ type: String, required: true }) title: string;
}

@Schema({ collection: 'soft-comments' })
class SoftComment extends SoftDeletableEntity {
  @Prop({ type: String, required: true }) postId: string;
  @Prop({ type: String, required: true }) body: string;
}

// When SoftPost is soft-deleted, SoftComment children are also soft-deleted
DynamicApiModule.forFeature({
  entity: SoftPost,
  controllerOptions: { path: 'soft-posts' },
  routes: [
    {
      type: 'DeleteOne',
      cascade: [
        { entity: SoftComment, foreignKey: 'postId', on: 'softDelete' },
        // softDelete: undefined → mirrors parent (soft-delete children too)
      ],
    },
  ],
  extraImports: [
    DynamicApiModule.forFeature({ entity: SoftComment, controllerOptions: { path: 'soft-comments' }, routes: [] }),
  ],
});
```

### Atomicity ⭐ *New*

Cascade operations are **automatically atomic** when your MongoDB connection is a **replica set** (or mongos) — the parent delete and every matching cascade write run inside a single MongoDB session transaction. If any of them fails, the whole thing rolls back: the parent document is **not** deleted either.

```typescript
// If the cascade delete on CommentEntity fails for any reason, PostEntity is NOT deleted —
// the parent delete and the cascade are one atomic unit, not two separate operations.
DynamicApiModule.forFeature({
  entity: PostEntity,
  controllerOptions: { path: 'posts' },
  routes: [
    { type: 'DeleteOne', cascade: [{ entity: CommentEntity, foreignKey: 'postId', on: 'delete' }] },
  ],
})
```

No configuration needed — this is automatic whenever `cascade` is set and the connection supports transactions.

> ⚠️ **Standalone MongoDB instances don't support transactions at all** (a hard MongoDB limitation, not something any driver or library can work around). Against a standalone instance, cascade automatically **falls back** to the previous behavior — the parent delete and each cascade write run sequentially, non-atomically — and a warning is logged once per cascade call (`MONGODB_DYNAMIC_API_LOGGER=WARN` or more verbose — see [Debugging](./debugging.md)). If a cascade delete fails mid-way on a standalone instance, the parent document is already deleted but some children may remain, exactly as before.
>
> **To get atomicity, your MongoDB deployment needs to be a replica set** (a single-member replica set is enough — it doesn't require multiple physical nodes). See MongoDB's [Convert a Standalone to a Replica Set](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/) guide, or this repo's own `compose.yaml` for a working single-node example (includes the `keyFile` MongoDB requires once `--auth` and `--replSet` are combined).

---

## Audit Log ⭐ *New*

Set `auditLog: true` on a **mutation route** to record every write it performs to the entity's own `<collection>_audit_log` collection — a simple, opt-in change history, per entity, with zero extra setup.

```typescript
DynamicApiModule.forFeature({
  entity: PostEntity,
  controllerOptions: { path: 'posts' },
  routes: [
    { type: 'CreateOne', auditLog: true },
    { type: 'UpdateOne', auditLog: true },
    { type: 'DeleteOne', auditLog: true },
    { type: 'GetMany' }, // read routes ignore auditLog — nothing to audit
  ],
})
```

Applies to `CreateOne`, `CreateMany`, `UpdateOne`, `UpdateMany`, `ReplaceOne`, `DuplicateOne`, `DuplicateMany`, `DeleteOne` and `DeleteMany`. Has no effect on `GetOne`, `GetMany` or `Aggregate` — there's nothing to audit on a read.

Each successful mutation inserts one document per affected entity into `<collection>_audit_log` (e.g. `posts_audit_log` for a `posts` collection), written through the native MongoDB driver — no schema, no model registration needed:

```typescript
{
  action: 'create' | 'update' | 'replace' | 'duplicate' | 'delete',
  entityId: string,
  before: Record<string, unknown> | null, // null for create/duplicate — nothing existed yet
  after: Record<string, unknown> | null,  // null for delete — nothing remains
  user: unknown,                          // whatever fromUser/the request resolved as the caller
  timestamp: Date,
}
```

> The write happens **after** the mutation succeeds and after `callback` runs, and is **best-effort**: if it fails (e.g. a transient connection issue), the failure is logged (`MONGODB_DYNAMIC_API_LOGGER=WARN` or more verbose — see [Debugging](./debugging.md)) and swallowed — it never turns a successful mutation into a failed response.
>
> `auditLog` and `callback`/`callbackRetry` are independent — set any combination of them on the same route.

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

### populate

Populates related documents on **`GetOne`** and **`GetMany`** routes, using the same syntax Mongoose's own `Query.populate()` accepts. Applied **server-side and unconditionally** — it's part of the route's static configuration, not something the client can request or override via a query parameter (no `?populate=...`). That's a deliberate choice: an always-on, server-controlled `populate` can't be abused to pull in arbitrary/expensive relations the client wasn't meant to request.

```typescript
routes: [
  {
    type: 'GetOne',
    populate: 'author', // bare path
  },
  {
    type: 'GetMany',
    populate: { path: 'author', select: 'name email' }, // PopulateOptions object
  },
  {
    type: 'GetOne',
    subPath: 'with-comments',
    populate: ['author', { path: 'comments', populate: 'author' }], // array, nested populate
  },
]
```

> **Scope:** `GetOne` and `GetMany` only (HTTP and WebSocket — both transports share the same underlying service, so `populate` applies to both automatically). No effect on other route types.

> **Swagger note:** the generated OpenAPI schema still reflects the entity's raw shape (e.g. `author` typed as a string id) — it does not currently expand to the populated document's shape. The response body itself is populated correctly at runtime; only the Swagger documentation doesn't (yet) reflect it.

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

### predicateBehavior

Controls how `abilityPredicate` reacts when a document fails the authorization check on **`GetMany`** and **`Aggregate`** routes.

| Value | Behavior |
|---|---|
| `'throw'` *(default)* | If **any** document fails the predicate, the entire request is rejected with **403 Forbidden**. Same as omitting this option. |
| `'filter'` | Documents that fail the predicate are **silently removed** from the response. The request always returns **200** with the authorized subset (empty array `[]` if none pass). |

> **Scope:** `GetMany` (HTTP + WebSocket) and `Aggregate` (HTTP + WebSocket) only. No effect on `GetOne`, `UpdateOne`, etc.

```typescript
routes: [
  {
    type: 'GetMany',
    // Silently filter documents the user is not allowed to see
    predicateBehavior: 'filter',
    abilityPredicate: (product, user) => product.visible || user.role === 'admin',
  },
]
```

**Important notes:**

- When `predicateBehavior: 'filter'`, the guard's pre-flight DB check is **bypassed entirely**. Filtering occurs inside the service after documents are fetched.
- **Pagination / `limit`** — Option A: if `limit: 10` is requested and 3 documents are filtered out, the response will contain **< 10 documents**. No re-query is performed.
- **Aggregate `count`/`totalPage`** — with `predicateBehavior: 'filter'` on `Aggregate`, `count` and `totalPage` always describe the **full** pipeline result, never recomputed from the filtered `list`. Only `list` narrows to the caller's authorized subset; a page can legitimately show fewer items than `count` suggests.
- **Aggregate + `.Paging()`** — `abilityPredicate` is fully compatible with a pipeline built via `PipelineBuilder(...).Paging(...)`, in both `'throw'` and `'filter'` mode. (A pre-fix version of the library crashed with a 500 on `'throw'` mode against a paginated pipeline, regardless of the predicate's outcome — fixed.)
- `'throw'` (or omitting `predicateBehavior`) preserves the existing behaviour: the guard pre-checks all fetched documents and throws 403 if any fails.

```typescript
// Full example — mixed configuration
DynamicApiModule.forFeature({
  entity: Article,
  controllerOptions: { path: 'articles' },
  routes: [
    {
      type: 'GetMany',
      // Public users see only published articles; no 403 ever raised
      isPublic: true,
      predicateBehavior: 'filter',
      abilityPredicate: (article, user) =>
        article.status === 'published' || (user && user.role === 'admin'),
    },
    {
      type: 'GetOne',
      // Keep strict 403 for single-document access
      predicateBehavior: 'throw', // or simply omit
      abilityPredicate: (article, user) =>
        article.status === 'published' || user.role === 'admin',
    },
  ],
})
```

> 📚 See [Authorization guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README/authorization.md#filter-mode-vs-throw-mode) for the full comparison.

> ⚠️ **Cache interaction:** `predicateBehavior: 'filter'` makes the Guard skip its per-request check
> entirely — filtering happens once, in the service. Combined with an **active cache** on a non-public route,
> whether that's safe depends on `cacheOptions.keyBy` (default `'url+identity'` keys each caller separately —
> safe; `'url'` shares one entry across every caller — not safe). `DynamicApiModule.forFeature` logs a
> warning at registration (via `MONGODB_DYNAMIC_API_LOGGER`) if you combine `'filter'` + `abilityPredicate`
> on a cached, non-public `GetMany`/`Aggregate` route without `disableCache: true`, as a prompt to double
> check `keyBy` for that route. Public routes (`isPublic: true`) are exempt — their response is meant to be
> shared by every caller anyway. See [Caching → predicateBehavior: 'filter' and Cache](./caching.md#predicatebehavior-filter-and-cache).

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
interface BroadcastConfig<Entity> {
  enabled: boolean | ((data: Entity, user: unknown) => boolean);
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

### fromUser

Automatically injects values from the **authenticated user's JWT payload** (`req.user`) into the body before the `beforeSaveCallback` and persistence. Supported on all mutating routes: `CreateOne`, `CreateMany`, `UpdateOne`, `UpdateMany`, `ReplaceOne`, `DuplicateOne`, `DuplicateMany`.

> 📌 **Execution order:** `fromUser` injection → `beforeSaveCallback` → `@DerivedField` computation → DB write.

#### Signature

```typescript
type FromUserMap<Entity> = Partial<
  Record<keyof Entity, string | ((user: unknown) => unknown)>
>;
```

| Source type | Description |
|-------------|-------------|
| `string` | Key name on `req.user` — value is read as `req.user[key]` |
| `(user) => value` | Extractor function — receives `req.user` and returns the value |

> ⚠️ If `req.user` is `undefined` or `null` (unauthenticated route), `fromUser` is silently skipped.

#### Example

```typescript
// Entity
@Schema({ collection: 'posts' })
export class Post extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  @ProtectedField()   // Cannot be set by the client
  createdBy: string;

  @Prop({ type: String })
  @ProtectedField()
  tenantId: string;
}
```

```typescript
// Module
DynamicApiModule.forFeature({
  entity: Post,
  controllerOptions: { path: 'posts' },
  routes: [
    {
      type: 'CreateOne',
      fromUser: {
        // Inject req.user.email into createdBy
        createdBy: 'email',
        // Inject computed value from req.user
        tenantId: (user) => (user as JwtPayload).tenantId,
      },
    },
  ],
})
```

**POST /posts** (JWT: `{ email: "alice@co.com", tenantId: "tenant-42" }`)

Request body (client sends):
```json
{ "title": "Hello World" }
```

Persisted document:
```json
{
  "title": "Hello World",
  "createdBy": "alice@co.com",
  "tenantId": "tenant-42"
}
```

> 💡 Combine `@ProtectedField()` with `fromUser` for the most secure pattern: the field is excluded from the DTO (client cannot submit it) **and** automatically filled from JWT. See [Entities docs](./entities.md#combo-pattern-protectedfield--fromuser).

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


