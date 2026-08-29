[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Authorization (Ability Predicates)

Authorization provides fine-grained access control for your API routes based on user properties. Use ability predicates to dynamically determine who can access specific endpoints.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Levels](#configuration-levels)
- [Filter Mode vs Throw Mode](#filter-mode-vs-throw-mode)
- [Advanced Predicates](#advanced-predicates)
- [Standard Predicates](#standard-predicates)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Step 1: Add Authorization Fields to User Entity

```typescript
// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ example: 'admin' })
  @Prop({ type: String, enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
```

### Step 2: Configure Authentication with Additional Fields

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user.entity';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
      useAuth: {
        userEntity: User,
        login: {
          // Make these fields available in JWT payload
          additionalFields: ['role', 'isAdmin', 'isActive'],
        },
        register: {
          // Allow setting these fields during registration
          additionalFields: [
            { name: 'role', required: false },
            { name: 'isAdmin', required: false },
          ],
        },
      },
    }),
  ],
})
export class AppModule {}
```

### Step 3: Apply Authorization Rules

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user.entity';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        // Only admins can access specific routes
        abilityPredicates: [
          {
            targets: ['CreateOne', 'UpdateOne', 'DeleteOne'],
            predicate: (user, currentUser) => currentUser.isAdmin === true,
          },
        ],
      },
    }),
  ],
})
export class UsersModule {}
```

**🎉 Done!** Now only users with `isAdmin: true` can create, update, or delete users.

**Ability Predicate Signature:**
- **Controller-level**: `(entity: Entity, user: User) => boolean`
- **Route-level**: `(entity: Entity, user: User) => boolean`

The `entity` parameter is the document being accessed, and `user` is the authenticated user.

---

## Configuration Levels

Authorization can be applied at three different levels, with route-level rules taking precedence:

### 1. Controller-Level Authorization

Applies to specific routes using `abilityPredicates` array:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    abilityPredicates: [
      {
        targets: ['CreateOne', 'UpdateOne', 'DeleteOne'],
        predicate: (product, user) => user.role === 'admin' || user.role === 'moderator',
      },
      {
        targets: ['GetMany', 'GetOne'],
        predicate: (product, user) => user.isActive === true,
      },
    ],
  },
})
```

**Structure:**
- `targets`: Array of route types this predicate applies to
- `predicate`: Function `(entity, user) => boolean` to check access

### 2. Route-Level Authorization

Applies to specific routes (overrides controller-level):

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    abilityPredicates: [
      {
        targets: ['GetMany', 'GetOne'],
        predicate: (product, user) => user.isActive === true,
      },
    ],
  },
  routes: [
    {
      type: 'GetMany',
      // Anyone authenticated can view products list
      abilityPredicate: undefined,
    },
    {
      type: 'GetOne',
      // Check if user can view this specific product
      abilityPredicate: (product, user) => {
        return product.isPublic || product.ownerId === user.id || user.role === 'admin';
      },
    },
    {
      type: 'CreateOne',
      // Only admins can create
      abilityPredicate: (product, user) => user.role === 'admin',
    },
    {
      type: 'UpdateOne',
      // Owner or admin can update
      abilityPredicate: (product, user) => {
        return product.ownerId === user.id || user.role === 'admin';
      },
    },
    {
      type: 'DeleteOne',
      // Only admins can delete
      abilityPredicate: (product, user) => user.role === 'admin',
    },
  ],
})
```

**Note:** Route-level `abilityPredicate` receives both the `entity` being accessed and the authenticated `user`.

### 3. Mixed Authorization

Combine both levels for flexible control:

```typescript
DynamicApiModule.forFeature({
  entity: Article,
  controllerOptions: {
    path: 'articles',
    abilityPredicates: [
      {
        targets: ['CreateOne', 'UpdateOne', 'DeleteOne'],
        predicate: (article, user) => {
          // Authors and admins can manage articles
          return user.role === 'author' || user.role === 'admin';
        },
      },
    ],
  },
  routes: [
    {
      type: 'GetMany',
      // Public access for reading articles
      abilityPredicate: (article, user) => true,
    },
    {
      type: 'GetOne',
      // Public access for reading a single article
      abilityPredicate: (article, user) => true,
    },
    {
      type: 'UpdateOne',
      // Only the author or admin can update their own article
      abilityPredicate: (article, user) => {
        return article.authorId === user.id || user.role === 'admin';
      },
    },
    {
      type: 'DeleteOne',
      // Only admins can delete articles
      abilityPredicate: (article, user) => user.role === 'admin',
    },
  ],
})
```

---

## Filter Mode vs Throw Mode

By default, `abilityPredicate` on `GetMany` and `Aggregate` routes behaves in **throw mode**: if *any* fetched document fails the predicate, the entire request is rejected with **403 Forbidden**.

The `predicateBehavior` option (available on `GetMany` and `Aggregate` only) lets you switch to **filter mode**, where non-authorized documents are silently excluded from the response.

### Comparison

| | `'throw'` (default) | `'filter'` |
|---|---|---|
| 1 doc fails predicate | ❌ 403 Forbidden | ✅ Doc excluded, rest returned |
| All docs fail | ❌ 403 Forbidden | ✅ `[]` returned (200) |
| All docs pass | ✅ Full list | ✅ Full list |
| Guard pre-flight DB check | ✅ Runs | ⏭️ Bypassed |
| Filtering location | Guard (pre-request) | Service (post-query) |

### When to use `'filter'`

- **Public listings** where some documents are restricted (e.g. published vs draft articles).
- **Multi-tenant feeds** where each user should only see their own records without revealing the existence of others.
- **Soft visibility** flags — hide records instead of exposing authorization errors.

### When to keep `'throw'`

- **Strict access control** where a user should never silently receive a partial list.
- Routes where the absence of a document would be misleading (e.g. `GetOne` equivalents built with `GetMany`).

### Example

```typescript
DynamicApiModule.forFeature({
  entity: Article,
  controllerOptions: { path: 'articles' },
  routes: [
    {
      type: 'GetMany',
      isPublic: true,
      // Authenticated admins see all; anonymous/non-admin users see only published articles
      predicateBehavior: 'filter',
      abilityPredicate: (article, user) =>
        article.status === 'published' || (user?.role === 'admin'),
    },
    {
      type: 'Aggregate',
      // Same filter mode on aggregate — count/totalPage still describe the full pipeline result
      predicateBehavior: 'filter',
      abilityPredicate: (article, user) => article.tenantId === user.tenantId,
      dTOs: { query: ArticleStatsQuery },
    },
  ],
})
```

> **Pagination note (Option A):** when `predicateBehavior: 'filter'`, results are filtered *after* the MongoDB query. If you request `limit: 10` and 3 documents are filtered out, you receive **< 10 documents**. No re-query is performed.

> **Aggregate `count`/`totalPage` note:** in filter mode, `count` and `totalPage` always describe
> the **full** pipeline result (how many documents actually match, how many pages that makes) —
> they are never recomputed from the filtered `list`. Only `list` narrows to what the caller is
> personally authorized to see; a page can legitimately show fewer items than `count`/`totalPage`
> would suggest. This keeps the two numbers mutually consistent (an earlier version recomputed
> `count` as the filtered list's length while leaving `totalPage` based on the full total, which
> could read as a nonsensical pair like "count: 1, totalPage: 2" for a single visible item).
> `abilityPredicate` + `.Paging()` is fully supported in both modes: `'throw'` mode's guard
> pre-check no longer crashes on a paginated pipeline (fixed — it used to always fail with a 500,
> regardless of the predicate's outcome).

---

## Advanced Predicates



```typescript
const isAdmin = (user) => user.role === 'admin';
const isModerator = (user) => user.role === 'moderator';
const isAuthor = (user) => user.role === 'author';

DynamicApiModule.forFeature({
  entity: Post,
  controllerOptions: {
    path: 'posts',
  },
  routes: [
    { 
      type: 'GetMany', 
      abilityPredicate: (post, user) => true, // Public
    },
    { 
      type: 'GetOne', 
      abilityPredicate: (post, user) => true, // Public
    },
    { 
      type: 'CreateOne', 
      abilityPredicate: (post, user) => isAuthor(user) || isAdmin(user),
    },
    { 
      type: 'UpdateOne', 
      abilityPredicate: (post, user) => {
        // Author of the post or moderator/admin
        return post.authorId === user.id || isModerator(user) || isAdmin(user);
      },
    },
    { 
      type: 'DeleteOne', 
      abilityPredicate: (post, user) => isAdmin(user),
    },
  ],
})
```

### Multi-Condition Authorization

```typescript
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
  },
  routes: [
    {
      type: 'GetMany',
      abilityPredicate: (order, user) => {
        // Must be active and have appropriate role
        return user.isActive && ['customer', 'admin'].includes(user.role);
      },
    },
    {
      type: 'GetOne',
      abilityPredicate: (order, user) => {
        // User can view their own orders or admin can view all
        return order.customerId === user.id || user.role === 'admin';
      },
    },
    {
      type: 'UpdateOne',
      abilityPredicate: (order, user) => {
        // Admin or customer service with permissions can update
        // Customer can only update their own pending orders
        if (user.role === 'admin') return true;
        if (user.role === 'customer_service' && user.canModifyOrders) return true;
        return order.customerId === user.id && order.status === 'pending';
      },
    },
    {
      type: 'DeleteOne',
      abilityPredicate: (order, user) => {
        // Only senior admins
        return user.role === 'admin' && user.level >= 3;
      },
    },
  ],
})
```

### Organization-Based Access

```typescript
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String })
  organizationId: string;

  @Prop({ type: String })
  role: string;
}

// Configuration
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['organizationId', 'role'],
    },
  },
})

// Usage in feature module
DynamicApiModule.forFeature({
  entity: Document,
  controllerOptions: {
    path: 'documents',
    abilityPredicates: [
      {
        targets: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        predicate: (document, user) => {
          // User must belong to an organization
          return user.organizationId !== undefined && user.organizationId !== null;
        },
      },
    ],
  },
  routes: [
    {
      type: 'GetOne',
      abilityPredicate: (document, user) => {
        // User can only access documents from their organization
        return document.organizationId === user.organizationId || user.role === 'super_admin';
      },
    },
    {
      type: 'UpdateOne',
      abilityPredicate: (document, user) => {
        // Must be from same organization and have appropriate role
        return document.organizationId === user.organizationId && 
               (user.role === 'org_admin' || user.role === 'editor');
      },
    },
    {
      type: 'DeleteOne',
      abilityPredicate: (document, user) => {
        // Only org admin from same organization
        return document.organizationId === user.organizationId && user.role === 'org_admin';
      },
    },
  ],
})
```

### Permission-Based Access

```typescript
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

// Configuration
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['permissions'],
    },
  },
})

// Helper function
const hasPermission = (user, permission: string) => {
  return user.permissions && user.permissions.includes(permission);
};

// Usage
DynamicApiModule.forFeature({
  entity: Report,
  controllerOptions: {
    path: 'reports',
  },
  routes: [
    {
      type: 'GetMany',
      abilityPredicate: (report, user) => hasPermission(user, 'reports:read'),
    },
    {
      type: 'CreateOne',
      abilityPredicate: (report, user) => hasPermission(user, 'reports:create'),
    },
    {
      type: 'UpdateOne',
      abilityPredicate: (report, user) => hasPermission(user, 'reports:update'),
    },
    {
      type: 'DeleteOne',
      abilityPredicate: (report, user) => hasPermission(user, 'reports:delete'),
    },
  ],
})
```

---

## Standard Predicates

The patterns shown above (ownership checks, admin/role checks, group scoping, soft-delete awareness, public-or-owner visibility, and combining predicates) are common enough that `mongodb-dynamic-api` ships them as ready-to-use, fully generic `AbilityPredicate` factories. Every factory accepts field-name options — none of them assume a specific schema, since `BaseEntity` only guarantees `id`/`createdAt`/`updatedAt`.

All predicates below are pure, synchronous `(entity, user) => boolean` functions, exactly like the hand-written ones in the sections above — they compose with `abilityPredicates`, route-level `abilityPredicate`, and `predicateBehavior: 'filter'` the same way.

### `isOwner`

Grants access when the entity's owner field matches the authenticated user's identifier field.
The comparison isn't a strict `===` by default: it falls back to a string-coerced comparison, so a
Mongoose `ObjectId` on the entity side (e.g. `family._id`) matches its string form on the user side
(e.g. `user.familyId`) with no extra configuration.

| Option | Default | Description |
|---|---|---|
| `entityField` | `'ownerId'` | Entity field holding the owner's identifier |
| `userField` | `'id'` | User field holding the current user's identifier. Also accepts an array of fallback field names, tried in order |
| `compare` | strict equality + string-coerced fallback | Custom `(entityValue, userValue) => boolean` comparison, for anything the default doesn't cover |

```typescript
import { isOwner } from 'mongodb-dynamic-api';

routes: [
  { type: 'UpdateOne', abilityPredicate: isOwner() },
  { type: 'DeleteOne', abilityPredicate: isOwner({ entityField: 'authorId' }) },
]

// identifier field name varies by auth flow (HTTP vs a raw JWT payload) — first match wins
abilityPredicate: isOwner({ userField: ['id', 'sub'] })
```

### `isAdmin`

Grants access to admin users — supports either a boolean flag convention (`user.isAdmin === true`) or a role-string convention (`user.role === 'admin'`), picked via options.

| Option | Default | Description |
|---|---|---|
| `field` | `'isAdmin'` | User field holding a boolean admin flag. Ignored when `roleField` is set |
| `roleField` | — | User field holding a role string. Setting this switches to role mode |
| `role` | `'admin'` | Role value(s) considered "admin" in role mode — a string or an array |

```typescript
import { isAdmin } from 'mongodb-dynamic-api';

abilityPredicate: isAdmin() // flag mode: user.isAdmin === true
abilityPredicate: isAdmin({ roleField: 'role' }) // role mode: user.role === 'admin'
abilityPredicate: isAdmin({ roleField: 'role', role: ['admin', 'superadmin'] })
```

### `isGroupMember`

Grants access when the entity's group matches (one of) the authenticated user's group(s). Generic enough to model family membership, team membership, organization/tenant scoping, or any "belongs to the same group" relationship — the user-side field can hold a single id or an array of ids, auto-detected at runtime. Same default comparison as `isOwner`: strict equality with a string-coerced fallback, applied element-wise when the user side is an array.

| Option | Default | Description |
|---|---|---|
| `entityField` | `'groupId'` | Entity field holding the group identifier |
| `userField` | `'groupId'` | User field holding the group id(s) — single value or array. Also accepts an array of fallback field names, tried in order |
| `compare` | strict equality + string-coerced fallback | Custom `(entityValue, userValue) => boolean` comparison, for anything the default doesn't cover |

```typescript
import { isGroupMember } from 'mongodb-dynamic-api';

// entity.groupId === user.groupId
abilityPredicate: isGroupMember()

// user.groupIds: string[] — entity.groupId checked against that array
abilityPredicate: isGroupMember({ userField: 'groupIds' })

// organization/tenant scoping
abilityPredicate: isGroupMember({ entityField: 'organizationId', userField: 'organizationId' })

// group field name varies by auth flow — first match wins, whether scalar or array
abilityPredicate: isGroupMember({ userField: ['groupIds', 'groupId'] })
```

### `isNotDeleted`

Denies access to soft-deleted entities. Works out of the box for entities extending `SoftDeletableEntity` (field `isDeleted`), or any entity with a custom flag via `field`.

| Option | Default | Description |
|---|---|---|
| `field` | `'isDeleted'` | Entity field flagging soft-deletion |

```typescript
import { isNotDeleted } from 'mongodb-dynamic-api';

abilityPredicate: isNotDeleted()
abilityPredicate: isNotDeleted({ field: 'archived' })
```

### `isPublic`

Grants access when the entity is flagged public. Meant to be combined with other predicates (typically `isOwner`) rather than used alone.

| Option | Default | Description |
|---|---|---|
| `field` | `'isPublic'` | Entity field flagging public visibility |

```typescript
import { isPublic } from 'mongodb-dynamic-api';

abilityPredicate: isPublic({ field: 'visibility' })
```

### `allOf`, `anyOf`, `not`

Combine any number of `AbilityPredicate`s — including the factories above and your own hand-written ones — into one:

- `allOf(...predicates)` — grants access only when **all** predicates pass (logical AND).
- `anyOf(...predicates)` — grants access when **any** predicate passes (logical OR).
- `not(predicate)` — inverts a predicate (logical NOT).

```typescript
import { allOf, anyOf, isGroupMember, isNotDeleted, isOwner, isPublic } from 'mongodb-dynamic-api';

routes: [
  {
    // Public entities, or the owner's own — non-public, non-owned entities are hidden
    type: 'GetMany',
    predicateBehavior: 'filter',
    abilityPredicate: anyOf(isPublic(), isOwner()),
  },
  {
    // Must be an active (non-deleted) member of the entity's group
    type: 'GetOne',
    abilityPredicate: allOf(isNotDeleted(), isGroupMember()),
  },
]
```

> **Note:** `isOwner`/`isAdmin`/`isGroupMember` all deny access (return `false`) rather than throw when `user` is `null`/`undefined` — the case for an anonymous request on a public route combined with `predicateBehavior: 'filter'`.

---

## Best Practices

### 1. Keep Predicates Simple

```typescript
// ✅ Good - Simple and readable
abilityPredicate: (entity, user) => user.isAdmin === true

// ❌ Avoid - Complex logic in predicates
abilityPredicate: (entity, user) => {
  const roles = ['admin', 'superadmin', 'owner'];
  const permissions = user.permissions || [];
  const hasRole = roles.includes(user.role);
  const hasPermission = permissions.some(p => p.startsWith('manage'));
  return hasRole || (hasPermission && user.verified);
}

// ✅ Better - Extract to named function
const canManageResource = (entity, user) => {
  const roles = ['admin', 'superadmin', 'owner'];
  const permissions = user.permissions || [];
  const hasRole = roles.includes(user.role);
  const hasPermission = permissions.some(p => p.startsWith('manage'));
  return hasRole || (hasPermission && user.verified);
};

abilityPredicate: canManageResource
```

### 2. Use Helper Functions

The most common patterns — `isOwner`, `isAdmin`, `isGroupMember`, `isNotDeleted`, `isPublic`, plus the `allOf`/`anyOf`/`not` composers — ship with the library (see [Standard Predicates](#standard-predicates)). Only write your own for the patterns that don't fit those, and compose them together with `allOf`/`anyOf`:

```typescript
// src/auth/ability-predicates.ts
import { AbilityPredicate } from 'mongodb-dynamic-api';

export const isModerator: AbilityPredicate<any> = (entity, user) => user.role === 'moderator';
export const isActive: AbilityPredicate<any> = (entity, user) => user.isActive === true;

// Higher-order function for role checking not covered by isAdmin's `role` option
export const hasAnyRole = (...roles: string[]): AbilityPredicate<any> => (entity, user) =>
  roles.includes(user.role);

export const hasAllRoles = (...roles: string[]): AbilityPredicate<any> => (entity, user) =>
  roles.every(role => user.roles?.includes(role));

// Usage
import { anyOf, isAdmin, isOwner } from 'mongodb-dynamic-api';
import { hasAnyRole, isActive } from './auth/ability-predicates';

DynamicApiModule.forFeature({
  entity: User,
  routes: [
    { type: 'GetMany', abilityPredicate: isActive },
    // Owner or admin can edit
    { type: 'UpdateOne', abilityPredicate: anyOf(isOwner(), isAdmin({ roleField: 'role' })) },
    { type: 'CreateOne', abilityPredicate: hasAnyRole('admin', 'moderator') },
    { type: 'DeleteOne', abilityPredicate: isAdmin({ roleField: 'role' }) },
  ],
})
```

### 3. Secure by Default

```typescript
// ✅ Good - Secure by default, selectively open routes
DynamicApiModule.forFeature({
  entity: SensitiveData,
  controllerOptions: {
    path: 'sensitive-data',
    abilityPredicates: [
      {
        targets: ['CreateOne', 'UpdateOne', 'DeleteOne'],
        predicate: (data, user) => user.role === 'admin', // Secure by default
      },
    ],
  },
  routes: [
    {
      type: 'GetMany',
      abilityPredicate: (data, user) => user.role === 'admin' || user.role === 'auditor',
    },
  ],
})

// ❌ Avoid - Too permissive
DynamicApiModule.forFeature({
  entity: SensitiveData,
  controllerOptions: {
    path: 'sensitive-data',
    abilityPredicates: [
      {
        targets: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        predicate: (data, user) => true, // Too permissive
      },
    ],
  },
})
```

### 4. Request Only Necessary Fields

```typescript
// ✅ Good - Only request needed fields
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['role', 'isActive'], // Only what you need
    },
  },
})

// ❌ Avoid - Requesting everything
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: [
        'role', 'isActive', 'preferences', 'settings', 
        'profile', 'metadata', 'history', // Too much data
      ],
    },
  },
})
```

### 5. Test Your Authorization Rules

```typescript
// src/users/users.module.spec.ts
import { Test } from '@nestjs/testing';
import { isAdmin, hasRole } from './ability-predicates';

describe('Authorization Predicates', () => {
  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      const adminUser = { role: 'admin' };
      expect(isAdmin(adminUser)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      const regularUser = { role: 'user' };
      expect(isAdmin(regularUser)).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has one of the roles', () => {
      const user = { role: 'moderator' };
      const predicate = hasRole('admin', 'moderator');
      expect(predicate(user)).toBe(true);
    });

    it('should return false if user does not have any of the roles', () => {
      const user = { role: 'user' };
      const predicate = hasRole('admin', 'moderator');
      expect(predicate(user)).toBe(false);
    });
  });
});
```

---

## Examples

### Complete Authorization Setup

`isAdmin` and the `allOf`/`anyOf` composers come from the library; only the patterns it doesn't cover (`isAuthor`, `isModerator`, `isActive`, `isVerified`, permission checks) are hand-written — note they follow the real `(entity, user) => boolean` signature, not just `(user) => boolean`:

```typescript
// src/auth/ability-predicates.ts
import { AbilityPredicate } from 'mongodb-dynamic-api';

export const isModerator: AbilityPredicate<any> = (entity, user) => user.role === 'moderator';
export const isAuthor: AbilityPredicate<any> = (entity, user) => user.role === 'author';
export const isActive: AbilityPredicate<any> = (entity, user) => user.isActive === true;
export const isVerified: AbilityPredicate<any> = (entity, user) => user.isVerified === true;

export const hasPermission = (permission: string): AbilityPredicate<any> => (entity, user) =>
  user.permissions?.includes(permission);

export const hasAnyPermission = (...permissions: string[]): AbilityPredicate<any> => (entity, user) =>
  permissions.some(p => user.permissions?.includes(p));

// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ example: 'user', enum: ['user', 'author', 'moderator', 'admin'] })
  @Prop({ type: String, enum: ['user', 'author', 'moderator', 'admin'], default: 'user' })
  role: string;

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @ApiProperty({ example: ['posts:read', 'posts:write'] })
  @Prop({ type: [String], default: [] })
  permissions: string[];
}

// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user.entity';

@Module({
  imports: [
    DynamicApiModule.forRoot(process.env.MONGODB_URI, {
      useAuth: {
        userEntity: User,
        login: {
          additionalFields: ['role', 'isActive', 'isVerified', 'permissions'],
        },
        register: {
          additionalFields: [
            { name: 'role', required: false },
          ],
        },
      },
    }),
  ],
})
export class AppModule {}

// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { allOf, anyOf, DynamicApiModule, isAdmin } from 'mongodb-dynamic-api';
import { Post } from './post.entity';
import {
  isAuthor,
  isModerator,
  isActive,
  isVerified,
} from '../auth/ability-predicates';

const isAdminRole = isAdmin({ roleField: 'role' });

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Post,
      controllerOptions: {
        path: 'posts',
        // Default: must be active
        abilityPredicate: isActive,
      },
      routes: [
        {
          type: 'GetMany',
          // Public access
          abilityPredicate: () => true,
        },
        {
          type: 'GetOne',
          // Public access
          abilityPredicate: () => true,
        },
        {
          type: 'CreateOne',
          // Must be active, verified, and have author role or higher
          abilityPredicate: allOf(
            isActive,
            isVerified,
            anyOf(isAuthor, isModerator, isAdminRole)
          ),
        },
        {
          type: 'UpdateOne',
          // Moderators or admins
          abilityPredicate: anyOf(isModerator, isAdminRole),
        },
        {
          type: 'DeleteOne',
          // Only admins
          abilityPredicate: isAdminRole,
        },
      ],
    }),
  ],
})
export class PostsModule {}
```

### Protecting Registration

```typescript
// Only admins can register new users
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['isAdmin', 'role'],
    },
    register: {
      protected: true, // Requires authentication
      abilityPredicate: (user) => user.isAdmin === true, // Only admins
      additionalFields: [
        { name: 'role', required: true },
        { name: 'isAdmin', required: true },
      ],
    },
  },
})
```

---

## Related Documentation

- 🔐 **[Authentication](./authentication.md)** - Setup JWT authentication
- ✅ **[Validation](./validation.md)** - Validate request data
- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation

---

## Additional Resources

- [NestJS Authorization Guide](https://docs.nestjs.com/security/authorization)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)


















