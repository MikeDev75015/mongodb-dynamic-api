[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Callbacks

Callbacks are one of the most powerful features of `mongodb-dynamic-api`. They let you hook into the lifecycle of every service operation — either **before saving** (to transform, validate, or enrich data) or **after the operation** (to trigger side effects like audit logs, notifications, or cross-collection writes).

Both `beforeSaveCallback` and `callback` (after save) **receive the authenticated user** when authentication is enabled, making them ideal for audit trails, ownership tracking, and user-contextual logic.

## 📋 Table of Contents

- [Overview](#overview)
- [afterSave Callback (`callback`)](#aftersave-callback-callback)
  - [Signature](#aftersave-signature)
  - [Compatibility](#aftersave-compatibility)
  - [Example — Audit log after creation](#example--audit-log-after-creation)
  - [Example — Audit log with authenticated user](#example--audit-log-with-authenticated-user)
- [beforeSave Callback (`beforeSaveCallback`)](#beforesave-callback-beforesavecallback)
  - [Four callback signatures](#four-callback-signatures)
    - [BeforeSaveCallback (single-document write)](#beforesavecallback-single-document-write)
    - [BeforeSaveListCallback (multi-document write)](#beforesavelistcallback-multi-document-write)
    - [BeforeSaveDeleteCallback (single-document delete)](#beforesavedeletecallback-single-document-delete)
      - [BeforeSaveDeleteManyCallback (multi-document delete)](#beforesavedeletemanycallback-multi-document-delete)
  - [Context types per route](#context-types-per-route)
    - [BeforeSaveCreateContext](#beforesavecreatecontext)
    - [BeforeSaveCreateManyContext](#beforesavecreatemanycontext)
    - [BeforeSaveUpdateContext](#beforesaveupdatecontext)
    - [BeforeSaveUpdateManyContext](#beforesaveupdatemanycontext)
    - [BeforeSaveReplaceContext](#beforesavereplacecontext)
    - [BeforeSaveDuplicateContext](#beforesaveduplicatecontext)
    - [BeforeSaveDuplicateManyContext](#beforesaveduplicatemanycontext)
    - [BeforeSaveDeleteContext](#beforesavedeletecontext)
    - [BeforeSaveDeleteManyContext](#beforesavedeletemanycontext)
  - [Signature-to-route compatibility](#signature-to-route-compatibility)
- [beforeDelete Callback (`beforeDeleteCallback`)](#beforedelete-callback-beforedeletecallback)
  - [Why `beforeDeleteCallback` instead of `beforeSaveCallback`?](#why-beforedeletecallback-instead-of-beforesavecallback)
  - [Signatures](#beforedelete-signatures)
  - [Example — Block deletion based on business rule](#example--block-deletion-based-on-business-rule)
- [CallbackMethods](#callbackmethods)
- [rawUpdateOneDocument & rawUpdateManyDocuments](#rawupdateonedocument--rawupdatemanydocuments)
- [Accessing the authenticated user](#accessing-the-authenticated-user)
  - [Typing the user parameter](#typing-the-user-parameter)
  - [In beforeSaveCallback](#in-beforesavecallback)
  - [In afterSave callback](#in-aftersave-callback)
  - [HTTP and WebSocket](#http-and-websocket)
- [Complete examples](#complete-examples)
  - [Ownership stamping (createdBy / updatedBy)](#ownership-stamping-createdby--updatedby)
  - [Audit trail across all routes](#audit-trail-across-all-routes)
  - [Hash password before save](#hash-password-before-save)
  - [Prevent deletion with side-effect check](#prevent-deletion-with-side-effect-check)
- [Auth route callbacks](#auth-route-callbacks)
- [Deprecated aliases](#deprecated-aliases)

---

## Mutation Pipeline Order

For every mutating route (`CreateOne`, `UpdateOne`, `ReplaceOne`, etc.), the following pipeline is executed **in order**:

```
1. fromUser injection        (controller layer — injects JWT claims into body)
           ↓
2. beforeSaveCallback        (your hook — transform / validate / enrich)
           ↓
3. @DerivedField computation (service layer — computes server-side values, on:'save')
           ↓
4. DB write (model.create / model.findOneAndUpdate / …)
           ↓
5. buildInstance + @DerivedField on:'read' computation
           ↓
6. afterSave callback        (your hook — side effects, audit logs, notifications)
```

> ✅ `beforeSaveCallback` always sees the enriched body **after** `fromUser` injection, so you can use `context.toCreate.createdBy` directly.
> ✅ `@DerivedField(fn, { on:'save' })` fields are always computed **after** your callback, so your callback can modify source fields (e.g. `firstName`) and the derived field (e.g. `fullName`) will still be correct.

---

## Overview

| Property | Hook point | Purpose | Returns |
|---|---|---|---|
| `beforeSaveCallback` | **Before** the database write | Transform, enrich, or validate data | Transformed data (`Partial<Entity>` or `Partial<Entity>[]`) or `void` for delete |
| `callback` | **After** a successful operation | Side effects (audit, notification, cross-collection write) | `void` |

Both callbacks receive a `methods` object ([CallbackMethods](#callbackmethods)) giving you full access to CRUD operations on **any collection** in the database.

Both callbacks also receive the **authenticated user** (if authentication is enabled) as the last parameter.

---

## afterSave Callback (`callback`)

The `callback` property is executed **after a successful operation** (create, update, replace, duplicate, delete, get). It is the right place to trigger side effects that should happen once the primary operation has succeeded.

### afterSave Signature

```typescript
type AfterSaveCallback<Entity extends BaseEntity, User = unknown> = (
  entity: Entity,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```

| Parameter | Type | Description |
|---|---|---|
| `entity` | `Entity` | The entity that was just created, updated, fetched, or deleted. For `GetMany`/`DeleteMany` routes, the callback is called **once per entity**. |
| `methods` | `CallbackMethods` | Database helper methods (see [CallbackMethods](#callbackmethods)). |
| `user` | `User` (optional, defaults to `unknown`) | The authenticated user when auth is enabled. Use the `User` generic to type it (see [Typing the user parameter](#typing-the-user-parameter)). |

### afterSave Compatibility

The `callback` property is available on **all route types**:

| Route Type | `entity` content |
|---|---|
| `CreateOne` | The newly created entity |
| `CreateMany` | Called once per created entity |
| `UpdateOne` | The updated entity |
| `UpdateMany` | Called once per updated entity |
| `ReplaceOne` | The replaced entity |
| `DuplicateOne` | The newly duplicated entity |
| `DuplicateMany` | Called once per duplicated entity |
| `DeleteOne` | The deleted entity |
| `DeleteMany` | Called once per deleted entity |
| `GetOne` | The fetched entity |
| `GetMany` | Called once per fetched entity |

### Example — Audit log after creation

```typescript
import { AfterSaveCallback } from 'mongodb-dynamic-api';

const onOrderCreated: AfterSaveCallback<Order> = async (order, methods) => {
  await methods.createOneDocument(AuditLog, {
    action: 'OrderCreated',
    entityId: order.id,
  });
};

DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: { path: 'orders' },
  routes: [
    { type: 'CreateOne', callback: onOrderCreated },
  ],
})
```

### Example — Audit log with authenticated user

```typescript
// ✅ With the User generic — full type safety, no manual cast needed
const onOrderCreated: AfterSaveCallback<Order, UserEntity> = async (order, methods, user) => {
  // user is typed as UserEntity | undefined
  await methods.createOneDocument(AuditLog, {
    action: 'OrderCreated',
    entityId: order.id,
    performedBy: user?.email ?? 'anonymous',
  });
};

// Also valid: without the generic (user defaults to unknown, manual cast needed)
const onOrderCreatedAlt: AfterSaveCallback<Order> = async (order, methods, user) => {
  const u = user as UserEntity | undefined;
  await methods.createOneDocument(AuditLog, {
    action: 'OrderCreated',
    entityId: order.id,
    performedBy: u?.email ?? 'anonymous',
  });
};
```

---

## beforeSave Callback (`beforeSaveCallback`)

The `beforeSaveCallback` property is executed **before the database write**. Its purpose is to transform, enrich, or validate the data before it is persisted. The return value **replaces** the data that will be saved (except for delete callbacks which return `void`).

### Four callback signatures

The signature varies depending on whether the route operates on a single document, multiple documents, or a delete operation.

#### BeforeSaveCallback (single-document write)

Used by: **`CreateOne`**, **`UpdateOne`**, **`ReplaceOne`**, **`DuplicateOne`**

```typescript
type BeforeSaveCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<Partial<Entity>>;
```

| Parameter | Type | Description |
|---|---|---|
| `entity` | `Entity \| undefined` | The existing document before modification. `undefined` for `CreateOne` (the document doesn't exist yet). |
| `context` | `Context` | Typed context object containing the incoming data (see [Context types](#context-types-per-route)). |
| `methods` | `CallbackMethods` | Database helper methods. |
| `user` | `User` (optional, defaults to `unknown`) | The authenticated user. Use the `User` generic to type it. |
| **Returns** | `Partial<Entity>` | The transformed data that will be saved. |

#### BeforeSaveListCallback (multi-document write)

Used by: **`CreateMany`**, **`UpdateMany`**, **`DuplicateMany`**

```typescript
type BeforeSaveListCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[] | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<Partial<Entity>[]>;
```

| Parameter | Type | Description |
|---|---|---|
| `entities` | `Entity[] \| undefined` | Existing documents before modification. `undefined` for `CreateMany`. For `UpdateMany`/`DuplicateMany`, these are the documents that will be affected. |
| `context` | `Context` | Typed context object containing the incoming data. |
| `methods` | `CallbackMethods` | Database helper methods. |
| `user` | `User` (optional, defaults to `unknown`) | The authenticated user. Use the `User` generic to type it. |
| **Returns** | `Partial<Entity>[]` | Array of transformed data — one per entity. |

#### BeforeSaveDeleteCallback (single-document delete)

Used by: **`DeleteOne`**

```typescript
type BeforeSaveDeleteCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```

| Parameter | Type | Description |
|---|---|---|
| `entity` | `Entity \| undefined` | The document that is about to be deleted (if found). |
| `context` | `Context` | Contains the `id` of the document. |
| `methods` | `CallbackMethods` | Database helper methods. |
| `user` | `User` (optional, defaults to `unknown`) | The authenticated user. Use the `User` generic to type it. |
| **Returns** | `void` | Nothing — use this for pre-delete side effects (e.g. archiving). |

#### BeforeSaveDeleteManyCallback (multi-document delete)

Used by: **`DeleteMany`**

```typescript
type BeforeSaveDeleteManyCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[],
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```

| Parameter | Type | Description |
|---|---|---|
| `entities` | `Entity[]` | The documents that are about to be deleted. |
| `context` | `Context` | Contains the `ids` array. |
| `methods` | `CallbackMethods` | Database helper methods. |
| `user` | `User` (optional, defaults to `unknown`) | The authenticated user. Use the `User` generic to type it. |
| **Returns** | `void` | Nothing — use this for pre-delete side effects. |

---

### Context types per route

Each route type provides a **typed context object** as the second parameter of `beforeSaveCallback`. These types are exported from `mongodb-dynamic-api` and should be used as the second generic parameter of the callback type for full type safety.

#### BeforeSaveCreateContext

Route: **`CreateOne`**

```typescript
type BeforeSaveCreateContext<Entity> = {
  toCreate: Partial<Entity>;  // The data submitted for creation
};
```

#### BeforeSaveCreateManyContext

Route: **`CreateMany`**

```typescript
type BeforeSaveCreateManyContext<Entity> = {
  toCreate: Partial<Entity>[];  // Array of items submitted for creation
};
```

#### BeforeSaveUpdateContext

Route: **`UpdateOne`**

```typescript
type BeforeSaveUpdateContext<Entity> = {
  id: string;                // ID of the document to update
  update: Partial<Entity>;   // The partial update payload
};
```

#### BeforeSaveUpdateManyContext

Route: **`UpdateMany`**

```typescript
type BeforeSaveUpdateManyContext<Entity> = {
  ids: string[];             // IDs of the documents to update
  update: Partial<Entity>;   // The partial update (applied to all)
};
```

#### BeforeSaveReplaceContext

Route: **`ReplaceOne`**

```typescript
type BeforeSaveReplaceContext<Entity> = {
  id: string;                    // ID of the document to replace
  replacement: Partial<Entity>;  // The full replacement payload
};
```

#### BeforeSaveDuplicateContext

Route: **`DuplicateOne`**

```typescript
type BeforeSaveDuplicateContext<Entity> = {
  id: string;                   // ID of the document to duplicate
  override?: Partial<Entity>;   // Optional overrides for the duplicate
};
```

#### BeforeSaveDuplicateManyContext

Route: **`DuplicateMany`**

```typescript
type BeforeSaveDuplicateManyContext<Entity> = {
  ids: string[];                // IDs of the documents to duplicate
  override?: Partial<Entity>;   // Optional overrides for all duplicates
};
```

#### BeforeSaveDeleteContext

Route: **`DeleteOne`**

```typescript
type BeforeSaveDeleteContext = {
  id: string;  // ID of the document to delete
};
```

#### BeforeSaveDeleteManyContext

Route: **`DeleteMany`**

```typescript
type BeforeSaveDeleteManyContext = {
  ids: string[];  // IDs of the documents to delete
};
```

> **💡 Note:** All context types are exported from `mongodb-dynamic-api` and can be imported directly:
> ```typescript
> import {
>   BeforeSaveCreateContext,
>   BeforeSaveCreateManyContext,
>   BeforeSaveUpdateContext,
>   BeforeSaveUpdateManyContext,
>   BeforeSaveReplaceContext,
>   BeforeSaveDuplicateContext,
>   BeforeSaveDuplicateManyContext,
>   BeforeSaveDeleteContext,
>   BeforeSaveDeleteManyContext,
> } from 'mongodb-dynamic-api';
> ```

---

### Signature-to-route compatibility

| Route Type | Callback signature | Context type | `entity` / `entities` | Returns |
|---|---|---|---|---|
| `CreateOne` | `BeforeSaveCallback` | `BeforeSaveCreateContext<E>` | `undefined` | `Partial<E>` |
| `CreateMany` | `BeforeSaveListCallback` | `BeforeSaveCreateManyContext<E>` | `undefined` | `Partial<E>[]` |
| `UpdateOne` | `BeforeSaveCallback` | `BeforeSaveUpdateContext<E>` | Existing entity | `Partial<E>` |
| `UpdateMany` | `BeforeSaveListCallback` | `BeforeSaveUpdateManyContext<E>` | Existing entities | `Partial<E>[]` |
| `ReplaceOne` | `BeforeSaveCallback` | `BeforeSaveReplaceContext<E>` | Existing entity | `Partial<E>` |
| `DuplicateOne` | `BeforeSaveCallback` | `BeforeSaveDuplicateContext<E>` | Existing entity | `Partial<E>` |
| `DuplicateMany` | `BeforeSaveListCallback` | `BeforeSaveDuplicateManyContext<E>` | Existing entities | `Partial<E>[]` |
| `DeleteOne` | `BeforeSaveDeleteCallback` | `BeforeSaveDeleteContext` | Entity to delete | `void` |
| `DeleteMany` | `BeforeSaveDeleteManyCallback` | `BeforeSaveDeleteManyContext` | Entities to delete | `void` |

> **⚠️ Note:** `GetOne` and `GetMany` do **not** support `beforeSaveCallback` — they only support the `callback` (after save) property.

---

## beforeDelete Callback (`beforeDeleteCallback`)

> **Compatible routes:** `DeleteOne`, `DeleteMany` only.

### Why `beforeDeleteCallback` instead of `beforeSaveCallback`?

Both callbacks run before a delete operation, but there is a critical difference:

| | `beforeSaveCallback` on delete routes | `beforeDeleteCallback` |
|---|---|---|
| Runs before delete | ✅ | ✅ |
| Exception aborts delete | ✅ | ✅ |
| Exception propagates as HTTP error | ❌ (was silently swallowed as `{ deletedCount: 0 }` — **fixed in this version**) | ✅ (always) |
| Recommended for validation / guard | ❌ Use `beforeDeleteCallback` | ✅ |

> **Bug fix note:** Prior to this release, exceptions thrown inside `beforeSaveCallback` for `DeleteOne` and `DeleteMany` routes were caught internally and returned `{ deletedCount: 0 }` to the client instead of the correct HTTP error. **Both `beforeSaveCallback` and `beforeDeleteCallback` now correctly propagate HTTP exceptions.** `beforeDeleteCallback` is the preferred hook for delete-specific validation.

### beforeDelete Signatures

```typescript
import {
  BeforeDeleteCallback,
  BeforeDeleteManyCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
  CallbackMethods,
} from 'mongodb-dynamic-api';

// For DeleteOne
type BeforeDeleteCallback<Entity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,    // current document (undefined if not found before delete)
  context: BeforeSaveDeleteContext,  // { id: string }
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

// For DeleteMany
type BeforeDeleteManyCallback<Entity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[],            // matched documents (empty array if none found)
  context: BeforeSaveDeleteManyContext,  // { ids: string[] }
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;
```

### Example — Block deletion based on business rule

```typescript
import {
  BaseEntity,
  BeforeDeleteCallback,
  BeforeSaveDeleteContext,
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

const blockPinnedDeletion: BeforeDeleteCallback<PostEntity, BeforeSaveDeleteContext> =
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
      beforeDeleteCallback: blockPinnedDeletion,
    },
  ],
});
```

---

## CallbackMethods

Both `beforeSaveCallback` and `callback` receive a `methods` object that provides full CRUD access to **any collection** in the database. This is particularly useful for cross-collection operations (e.g., writing an audit log to a different collection).

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
  rawUpdateManyDocuments<T>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult>;
  rawUpdateOneDocument<T>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult>;
  deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult>;
  deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult>;
  aggregateDocuments<T>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]>;
};
```

> **💡 Tip:** The entity class you pass to `methods` methods does **not** need to be the same entity as the route. You can interact with any registered entity — this is how you create audit logs, send notifications to other collections, etc.

---

## rawUpdateOneDocument & rawUpdateManyDocuments

`rawUpdateOneDocument` and `rawUpdateManyDocuments` are purpose-built helpers for callbacks that need to apply **native MongoDB update operators** (e.g., `$push`, `$pull`, `$inc`) without bypassing the abstraction layer.

### Why use raw methods instead of `updateOneDocument`?

| | `updateOneDocument` / `updateManyDocuments` | `rawUpdateOneDocument` / `rawUpdateManyDocuments` |
|---|---|---|
| Accepted payload | `UpdateQuery<T>` (any shape) | `MongoUpdateOperators<T>` (operator keys only) |
| Runtime guard | ❌ | ✅ rejects keys without `$` |
| Intent in code | General-purpose | Explicit operator-only update |

### `MongoUpdateOperators<T>` type

```typescript
import { MongoUpdateOperators } from 'mongodb-dynamic-api';

type MongoUpdateOperators<T> = {
  $set?:      Partial<T>;
  $unset?:    Partial<Record<keyof T, '' | 1 | true>>;
  $inc?:      Partial<Record<keyof T, number>>;
  $push?:     Partial<{ [K in keyof T]: T[K] extends Array<infer U> ? U | { $each: U[] } : never }>;
  $pull?:     Partial<{ [K in keyof T]: T[K] extends Array<infer U> ? Partial<U> | FilterQuery<U> : never }>;
  $addToSet?: Partial<{ [K in keyof T]: T[K] extends Array<infer U> ? U | { $each: U[] } : never }>;
  $pop?:      Partial<Record<keyof T, -1 | 1>>;
  $rename?:   Partial<Record<keyof T, string>>;
};
```

> **⚠️ Runtime guard:** If any key in the payload does **not** start with `$`, a `400 BadRequest` is thrown immediately — the MongoDB query is never executed.

### Examples

#### `$set` — update specific fields

```typescript
const callback: AfterSaveCallback<OrderEntity> = async (order, methods) => {
  await methods.rawUpdateOneDocument(OrderEntity, { _id: order.id }, {
    $set: { status: 'confirmed', confirmedAt: new Date() },
  });
};
```

#### `$unset` — remove a field

```typescript
const callback: AfterSaveCallback<UserEntity> = async (user, methods) => {
  await methods.rawUpdateOneDocument(UserEntity, { _id: user.id }, {
    $unset: { resetPasswordToken: '' },
  });
};
```

#### `$push` — append to an array field

```typescript
const callback: AfterSaveCallback<PostEntity> = async (post, methods) => {
  await methods.rawUpdateOneDocument(PostEntity, { _id: post.id }, {
    $push: { tags: 'featured' } as MongoUpdateOperators<PostEntity>['$push'],
  });
};
```

#### `$pull` — remove matching elements from an array

```typescript
const callback: AfterSaveCallback<PostEntity> = async (post, methods) => {
  await methods.rawUpdateOneDocument(PostEntity, { _id: post.id }, {
    $pull: { tags: 'draft' } as MongoUpdateOperators<PostEntity>['$pull'],
  });
};
```

#### `$inc` — increment a numeric field

```typescript
const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
  await methods.rawUpdateOneDocument(ProductEntity, { _id: product.id }, {
    $inc: { viewCount: 1 } as MongoUpdateOperators<ProductEntity>['$inc'],
  });
};
```

#### `$addToSet` — add to array only if not present

```typescript
const callback: AfterSaveCallback<UserEntity> = async (user, methods) => {
  await methods.rawUpdateOneDocument(UserEntity, { _id: user.id }, {
    $addToSet: { roles: 'editor' } as MongoUpdateOperators<UserEntity>['$addToSet'],
  });
};
```

#### `$pop` — remove first or last array element

```typescript
const callback: AfterSaveCallback<QueueEntity> = async (queue, methods) => {
  // 1 = last element, -1 = first element
  await methods.rawUpdateOneDocument(QueueEntity, { _id: queue.id }, {
    $pop: { items: 1 } as MongoUpdateOperators<QueueEntity>['$pop'],
  });
};
```

#### `$rename` — rename a field

```typescript
const callback: AfterSaveCallback<LegacyEntity> = async (doc, methods) => {
  await methods.rawUpdateOneDocument(LegacyEntity, { _id: doc.id }, {
    $rename: { oldFieldName: 'newFieldName' },
  });
};
```

#### `rawUpdateManyDocuments` — bulk operator update

```typescript
const callback: AfterSaveCallback<ProductEntity> = async (_product, methods) => {
  // Increment stock for all low-stock products
  await methods.rawUpdateManyDocuments(ProductEntity, { stock: { $lt: 5 } }, {
    $inc: { stock: 10 } as MongoUpdateOperators<ProductEntity>['$inc'],
  });
};
```

---


When authentication is enabled (`useAuth` in `DynamicApiModule.forRoot`), the authenticated user is passed as the **last parameter** of both callbacks.

### Typing the user parameter

All callback types accept an optional `User` generic as their **last type parameter** (defaults to `unknown`). This lets you get **full type safety** on the `user` parameter without manual casting.

```typescript
import {
  AfterSaveCallback,
  BeforeSaveCallback,
  BeforeSaveListCallback,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteManyCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
} from 'mongodb-dynamic-api';

// Your user entity
@Schema({ collection: 'users' })
class UserEntity extends BaseEntity {
  @Prop() email: string;
  @Prop() role: string;
}
```

**Signatures with the `User` generic:**

| Callback type | Full signature |
|---|---|
| `AfterSaveCallback` | `AfterSaveCallback<Entity, User>` |
| `BeforeSaveCallback` | `BeforeSaveCallback<Entity, Context, User>` |
| `BeforeSaveListCallback` | `BeforeSaveListCallback<Entity, Context, User>` |
| `BeforeSaveDeleteCallback` | `BeforeSaveDeleteCallback<Entity, Context, User>` |
| `BeforeSaveDeleteManyCallback` | `BeforeSaveDeleteManyCallback<Entity, Context, User>` |

> **💡 Note:** The `User` generic defaults to `unknown`, so all existing code that omits it continues to work exactly as before — this is a **non-breaking** addition.

**With the generic (recommended):**

```typescript
// ✅ user is typed as UserEntity | undefined — no cast needed
const beforeSave: BeforeSaveCallback<Item, BeforeSaveCreateContext<Item>, UserEntity> =
  async (_entity, context, _methods, user) => {
    return {
      ...context.toCreate,
      createdBy: user?.email ?? 'anonymous', // ← autocomplete on user.email, user.role, etc.
    };
  };

const afterSave: AfterSaveCallback<Item, UserEntity> =
  async (entity, methods, user) => {
    await methods.createOneDocument(AuditLog, {
      action: 'Created',
      entityId: entity.id,
      performedBy: user?.email ?? 'anonymous', // ← typed!
    });
  };
```

**Without the generic (manual cast):**

```typescript
// Also valid — user is unknown, you cast it yourself
const beforeSave: BeforeSaveCallback<Item, BeforeSaveCreateContext<Item>> =
  async (_entity, context, _methods, user) => {
    const u = user as UserEntity | undefined;
    return {
      ...context.toCreate,
      createdBy: u?.email ?? 'anonymous',
    };
  };
```

### In beforeSaveCallback

```typescript
const beforeSave: BeforeSaveCallback<ItemEntity, BeforeSaveCreateContext<ItemEntity>, UserEntity> =
  async (_entity, context, _methods, user) => {
    // user is UserEntity | undefined — fully typed
    return {
      ...context.toCreate,
      createdBy: user?.email ?? 'anonymous',
    };
  };
```

### In afterSave callback

```typescript
const afterSave: AfterSaveCallback<ItemEntity, UserEntity> =
  async (entity, methods, user) => {
    // user is UserEntity | undefined — fully typed
    await methods.createOneDocument(AuditLog, {
      action: 'Created',
      entityId: entity.id,
      performedBy: user?.email ?? 'anonymous',
    });
  };
```

### HTTP and WebSocket

The `user` parameter is forwarded in **both HTTP and WebSocket** flows. When a WebSocket client authenticates (via access token), the user is extracted from the socket connection and passed to the callbacks exactly the same way as for HTTP requests.

```typescript
// Works identically for HTTP and WebSocket routes
const routes: DynamicAPIRouteConfig<ItemEntity>[] = [
  {
    type: 'CreateOne',
    webSocket: true,  // Also exposed via WebSocket
    callback: (async (entity, methods, user) => {
      // user is typed via the User generic when declared separately
      await methods.createOneDocument(AuditLog, {
        action: 'Created',
        entityId: entity.id,
        performedBy: (user as UserEntity | undefined)?.email ?? 'anonymous',
      });
    }) as AfterSaveCallback<ItemEntity>,
    beforeSaveCallback: (async (_entity, context, _methods, user) => {
      return {
        ...context.toCreate,
        createdBy: (user as UserEntity | undefined)?.email ?? 'anonymous',
      };
    }) as BeforeSaveCallback<ItemEntity, BeforeSaveCreateContext<ItemEntity>>,
  },
];

// Or extract to typed variables for full type safety:
const beforeCreate: BeforeSaveCallback<ItemEntity, BeforeSaveCreateContext<ItemEntity>, UserEntity> =
  async (_entity, context, _methods, user) => ({
    ...context.toCreate,
    createdBy: user?.email ?? 'anonymous', // ← user is UserEntity | undefined
  });

const afterCreate: AfterSaveCallback<ItemEntity, UserEntity> =
  async (entity, methods, user) => {
    await methods.createOneDocument(AuditLog, {
      action: 'Created',
      entityId: entity.id,
      performedBy: user?.email ?? 'anonymous', // ← user is UserEntity | undefined
    });
  };

const routes2: DynamicAPIRouteConfig<ItemEntity>[] = [
  {
    type: 'CreateOne',
    webSocket: true,
    callback: afterCreate,
    beforeSaveCallback: beforeCreate,
  },
];
```

---

## Complete examples

### Ownership stamping (createdBy / updatedBy)

Stamp every document with the authenticated user's email at creation and update time.

```typescript
import {
  BeforeSaveCallback,
  BeforeSaveListCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
  BeforeSaveReplaceContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  DynamicAPIRouteConfig,
} from 'mongodb-dynamic-api';

@Schema({ collection: 'items' })
class Item extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  updatedBy: string;
}

// With the User generic, no cast needed
const stampCreator = (user: UserEntity | undefined) => user?.email ?? 'anonymous';

const routes: DynamicAPIRouteConfig<Item>[] = [
  {
    type: 'CreateOne',
    beforeSaveCallback: (async (_e, ctx, _m, user) => ({
      ...ctx.toCreate,
      createdBy: stampCreator(user),
    })) as BeforeSaveCallback<Item, BeforeSaveCreateContext<Item>, UserEntity>,
  },
  {
    type: 'CreateMany',
    beforeSaveCallback: async (_e, ctx, _m, user) =>
      (ctx as BeforeSaveCreateManyContext<Item>).toCreate.map((item) => ({
        ...item,
        createdBy: stampCreator(user),
      })),
  },
  {
    type: 'UpdateOne',
    beforeSaveCallback: async (_e, ctx, _m, user) => ({
      ...(ctx as BeforeSaveUpdateContext<Item>).update,
      updatedBy: stampCreator(user),
    }),
  },
  {
    type: 'UpdateMany',
    beforeSaveCallback: async (entities, ctx, _m, user) =>
      (entities ?? []).map(() => ({
        ...(ctx as BeforeSaveUpdateManyContext<Item>).update,
        updatedBy: stampCreator(user),
      })),
  },
  {
    type: 'ReplaceOne',
    beforeSaveCallback: async (_e, ctx, _m, user) => ({
      ...(ctx as BeforeSaveReplaceContext<Item>).replacement,
      updatedBy: stampCreator(user),
    }),
  },
  {
    type: 'DuplicateOne',
    beforeSaveCallback: async (_e, ctx, _m, user) => ({
      ...((ctx as BeforeSaveDuplicateContext<Item>).override ?? {}),
      createdBy: stampCreator(user),
    }),
  },
  {
    type: 'DuplicateMany',
    beforeSaveCallback: async (entities, ctx, _m, user) =>
      (entities ?? []).map((e) => ({
        name: (e as any).name,
        ...((ctx as BeforeSaveDuplicateManyContext<Item>).override ?? {}),
        createdBy: stampCreator(user),
      })),
  },
];

DynamicApiModule.forFeature({
  entity: Item,
  controllerOptions: { path: 'items' },
  routes,
});
```

---

### Audit trail across all routes

Create an audit log for every operation (including reads) using `callback`:

```typescript
import { AfterSaveCallback, DynamicAPIRouteConfig } from 'mongodb-dynamic-api';

@Schema({ collection: 'audit-logs' })
class AuditLog extends BaseEntity {
  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String, required: true })
  entityId: string;

  @Prop({ type: String })
  performedBy: string;
}

// ✅ With the User generic — user is typed, no cast needed
const auditCallback = (action: string): AfterSaveCallback<Item, UserEntity> =>
  async (entity, methods, user) => {
    await methods.createOneDocument(AuditLog, {
      action,
      entityId: entity.id,
      performedBy: user?.email ?? 'anonymous',
    });
  };

const routes: DynamicAPIRouteConfig<Item>[] = [
  { type: 'CreateOne',     callback: auditCallback('CreateOne') },
  { type: 'CreateMany',    callback: auditCallback('CreateMany') },
  { type: 'UpdateOne',     callback: auditCallback('UpdateOne') },
  { type: 'UpdateMany',    callback: auditCallback('UpdateMany') },
  { type: 'ReplaceOne',    callback: auditCallback('ReplaceOne') },
  { type: 'DuplicateOne',  callback: auditCallback('DuplicateOne') },
  { type: 'DuplicateMany', callback: auditCallback('DuplicateMany') },
  { type: 'DeleteOne',     callback: auditCallback('DeleteOne') },
  { type: 'DeleteMany',    callback: auditCallback('DeleteMany') },
  { type: 'GetOne',        callback: auditCallback('GetOne') },
  { type: 'GetMany',       callback: auditCallback('GetMany') },
];
```

---

### Hash password before save

Transform sensitive data before it reaches the database:

```typescript
import * as bcrypt from 'bcrypt';
import {
  BeforeSaveCallback,
  BeforeSaveCreateContext,
  BeforeSaveUpdateContext,
  BeforeSaveReplaceContext,
} from 'mongodb-dynamic-api';

const hashIfPassword = async <T extends { password?: string }>(
  data: Partial<T>,
): Promise<Partial<T>> => {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return data;
};

const routes: DynamicAPIRouteConfig<User>[] = [
  {
    type: 'CreateOne',
    beforeSaveCallback: async (_e, ctx, _m) =>
      hashIfPassword((ctx as BeforeSaveCreateContext<User>).toCreate),
  },
  {
    type: 'UpdateOne',
    beforeSaveCallback: async (_e, ctx, _m) =>
      hashIfPassword((ctx as BeforeSaveUpdateContext<User>).update),
  },
  {
    type: 'ReplaceOne',
    beforeSaveCallback: async (_e, ctx, _m) =>
      hashIfPassword((ctx as BeforeSaveReplaceContext<User>).replacement),
  },
];
```

---

### Prevent deletion with side-effect check

Use `beforeSaveCallback` on delete routes to perform validation or archiving before the actual deletion:

```typescript
import {
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
} from 'mongodb-dynamic-api';

// ✅ With the User generic — user is typed as UserEntity | undefined
const beforeDeleteOne: BeforeSaveDeleteCallback<Item, BeforeSaveDeleteContext, UserEntity> =
  async (entity, context, methods, user) => {
    if (entity) {
      // Archive the document before deletion
      await methods.createOneDocument(ArchivedItem, {
        originalId: entity.id,
        name: (entity as any).name,
        archivedBy: user?.email ?? 'unknown',
        archivedAt: new Date().toISOString(),
      });
    }
  };

const beforeDeleteMany: BeforeSaveDeleteManyCallback<Item, BeforeSaveDeleteManyContext, UserEntity> =
  async (entities, context, methods, user) => {
    for (const entity of entities) {
      await methods.createOneDocument(ArchivedItem, {
        originalId: (entity as any)._id?.toString() ?? (entity as any).id,
        name: (entity as any).name,
        archivedBy: user?.email ?? 'unknown',
        archivedAt: new Date().toISOString(),
      });
    }
  };

const routes: DynamicAPIRouteConfig<Item>[] = [
  { type: 'DeleteOne', beforeSaveCallback: beforeDeleteOne },
  { type: 'DeleteMany', beforeSaveCallback: beforeDeleteMany },
];
```

---

## Auth route callbacks

Authentication routes (`register`, `login`, `updateAccount`, `resetPassword`) also support callbacks with the same `CallbackMethods`.

```typescript
DynamicApiModule.forRoot(uri, {
  useAuth: {
    userEntity: UserEntity,
    register: {
      // Transform user data before registration
      beforeSaveCallback: async (_entity, context, methods) => {
        const { toCreate } = context as BeforeSaveCreateContext<UserEntity>;
        return {
          ...toCreate,
          role: 'user',  // Force default role
        };
      },
      // Side effect after registration
      callback: async (user, methods) => {
        await methods.createOneDocument(WelcomeEmail, {
          email: user.email,
          sentAt: new Date().toISOString(),
        });
      },
    },
    updateAccount: {
      beforeSaveCallback: async (_entity, context, methods) => {
        const { update } = context as BeforeSaveUpdateContext<UserEntity>;
        if (update.password) {
          update.password = await bcrypt.hash(update.password, 10);
        }
        return update;
      },
      callback: async (user, methods) => {
        await methods.createOneDocument(AuditLog, {
          action: 'AccountUpdated',
          entityId: user.id,
        });
      },
    },
    login: {
      callback: async (user, methods) => {
        await methods.updateOneDocument(
          UserEntity,
          { _id: user.id },
          { $set: { lastLoginAt: new Date() } },
        );
      },
    },
  },
});
```

---

## Deprecated aliases

The following verbose names are still exported for backward compatibility but are **deprecated** and will be removed in v5:

| Deprecated name | Use instead |
|---|---|
| `DynamicApiServiceCallback` | `AfterSaveCallback` |
| `DynamicApiCallbackMethods` | `CallbackMethods` |
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

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)




