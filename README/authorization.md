[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Authorization (Ability Predicates)

Authorization provides fine-grained access control for your API routes based on user properties. Use ability predicates to dynamically determine who can access specific endpoints.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Levels](#configuration-levels)
- [Advanced Predicates](#advanced-predicates)
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

## Advanced Predicates

### Role-Based Access Control

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

```typescript
// src/auth/ability-predicates.ts
export const isAdmin = (entity, user) => user.role === 'admin';
export const isModerator = (entity, user) => user.role === 'moderator';
export const isActive = (entity, user) => user.isActive === true;

// Higher-order function for role checking
export const hasRole = (...roles: string[]) => (entity, user) => 
  roles.includes(user.role);

export const hasAnyRole = (...roles: string[]) => (entity, user) => 
  roles.some(role => user.role === role);

export const hasAllRoles = (...roles: string[]) => (entity, user) => 
  roles.every(role => user.roles?.includes(role));

// Entity-based predicates
export const isOwner = (entity, user) => entity.ownerId === user.id;
export const canEdit = (entity, user) => 
  entity.ownerId === user.id || user.role === 'admin';

// Usage
import { isAdmin, hasRole, canEdit } from './auth/ability-predicates';

DynamicApiModule.forFeature({
  entity: User,
  routes: [
    { type: 'GetMany', abilityPredicate: isActive },
    { type: 'UpdateOne', abilityPredicate: canEdit },
    { type: 'CreateOne', abilityPredicate: hasRole('admin', 'moderator') },
    { type: 'DeleteOne', abilityPredicate: isAdmin },
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

```typescript
// src/auth/ability-predicates.ts
export const isAdmin = (user: any) => user.role === 'admin';
export const isModerator = (user: any) => user.role === 'moderator';
export const isAuthor = (user: any) => user.role === 'author';
export const isActive = (user: any) => user.isActive === true;
export const isVerified = (user: any) => user.isVerified === true;

export const hasRole = (...roles: string[]) => (user: any) => 
  roles.includes(user.role);

export const hasPermission = (permission: string) => (user: any) => 
  user.permissions?.includes(permission);

export const hasAnyPermission = (...permissions: string[]) => (user: any) => 
  permissions.some(p => user.permissions?.includes(p));

export const allOf = (...predicates: Function[]) => (user: any) => 
  predicates.every(pred => pred(user));

export const anyOf = (...predicates: Function[]) => (user: any) => 
  predicates.some(pred => pred(user));

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
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { Post } from './post.entity';
import { 
  isAdmin, 
  isAuthor, 
  isModerator, 
  isActive, 
  isVerified,
  hasPermission,
  allOf,
  anyOf,
} from '../auth/ability-predicates';

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
            anyOf(isAuthor, isModerator, isAdmin)
          ),
        },
        {
          type: 'UpdateOne',
          // Moderators or admins
          abilityPredicate: anyOf(isModerator, isAdmin),
        },
        {
          type: 'DeleteOne',
          // Only admins
          abilityPredicate: isAdmin,
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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)


















