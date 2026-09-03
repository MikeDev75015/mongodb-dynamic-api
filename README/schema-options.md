[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Schema Options

Configure advanced Mongoose schema features using the `@DynamicApiSchema` decorator. This allows you to add indexes, lifecycle hooks, and custom schema initialization, alongside mongoose's own schema options (e.g. `collection`, `timestamps`), in a single call.

## 📋 Table of Contents

- [Indexes](#indexes)
  - [Syncing Indexes Safely (`enableDynamicAPIIndexSync`)](#syncing-indexes-safely-enabledynamicapiindexsync) ⭐ *New*
- [Hooks](#hooks)
- [Custom Initialization](#custom-initialization)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Indexes

Define indexes to optimize query performance and enforce data constraints.

### Basic Index

```typescript
import { DynamicApiSchema } from 'mongodb-dynamic-api';

@DynamicApiSchema({
  collection: 'users',
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
  ],
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;
}
```

### Multiple Indexes

```typescript
@DynamicApiSchema({
  collection: 'products',
  indexes: [
    // Unique index
    { fields: { email: 1 }, options: { unique: true } },
    // Simple index
    { fields: { name: 1 } },
    // Descending index
    { fields: { createdAt: -1 } },
    // Compound index
    { fields: { category: 1, price: -1 } },
    // Text index for search
    { fields: { title: 'text', description: 'text' } },
  ],
})
export class Product extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String })
  category: string;

  @Prop({ type: Number })
  price: number;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  description: string;
}
```

### Index Options

```typescript
@DynamicApiSchema({
  collection: 'sessions',
  indexes: [
    {
      fields: { email: 1 },
      options: {
        unique: true,
        sparse: true,      // Only index documents that have the field
        background: true,  // Build index in background
        name: 'email_unique_idx', // Custom index name
      },
    },
    {
      fields: { sessionToken: 1 },
      options: {
        expireAfterSeconds: 3600, // TTL index - auto-delete after 1 hour
      },
    },
  ],
})
export class Session extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  sessionToken: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}
```

---

### Syncing Indexes Safely (`enableDynamicAPIIndexSync`)

Adding a `unique` index to a field on an entity that already has documents in production is a classic trap: if any two existing documents both lack that field (or share the same value), MongoDB refuses to build the index and Mongoose surfaces a raw `E11000 duplicate key error` — often at boot, with no indication of *which* field or *why*.

`enableDynamicAPIIndexSync(app)` syncs indexes for every registered entity explicitly (`model.syncIndexes()` under the hood) and turns that failure into an actionable message instead:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIIndexSync } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await enableDynamicAPIIndexSync(app);

  await app.listen(3000);
}
bootstrap();
```

If legacy documents violate the new index, the app fails to boot with a message like:

```text
[DynamicAPI] enableDynamicAPIIndexSync: failed to build a unique index on "users" (field "email") —
existing documents already violate the uniqueness constraint. This is the classic case: legacy
documents that predate the field don't have it (so it's absent/null on all of them, and MongoDB
treats every one of those nulls as a duplicate of the others). Fix: scope the unique index to
documents where the field actually exists — e.g. `@Prop({ unique: true, partialFilterExpression:
{ email: { $exists: true } } })` — then re-run the sync. Original error: E11000 duplicate key error...
```

Applying the suggested fix:

```typescript
@Prop({ type: String, unique: true, partialFilterExpression: { email: { $exists: true } } })
email?: string;
```

…scopes the unique constraint to documents that actually have the field, so legacy documents missing it no longer clash with each other.

**Options**

| Option | Default | Description |
|---|---|---|
| `throwOnError` | `true` | When `true`, a duplicate-key failure is logged then rethrown — boot fails loudly. Set to `false` to log the error and keep booting regardless (useful for a first deploy where you want the app up while you plan the data migration). |

> **When a duplicate-value clash isn't the missing-field case** — e.g. two documents that both legitimately have `email: 'a@test.co'` — the message skips the `partialFilterExpression` suggestion and includes the original MongoDB error instead, since that's a real data conflict to resolve manually.

> **Any other index-build failure — not just `E11000`.** `enableDynamicAPIIndexSync` isn't limited to duplicate-key errors: whatever `model.syncIndexes()` rejects with, it rethrows (the duplicate-key case above is the one it additionally rewords into an actionable message). Without calling this helper at all, MongoDB rejecting an index at boot is a **silent** failure — `syncIndexes()` runs in the background and nothing awaits or surfaces it, so the app boots normally with the declared index simply never having been created. A common trap: MongoDB's `partialFilterExpression` only accepts a subset of operators (`$eq`, `$exists`, `$gt`/`$gte`, `$lt`/`$lte`, `$type`, a top-level `$and`) — `$ne`/`$not` are rejected:
>
> ```typescript
> // ❌ $ne isn't a valid partialFilterExpression operator — MongoDB rejects this index build.
> // Without enableDynamicAPIIndexSync, boot succeeds anyway and the index silently never exists.
> @Prop({ type: String, unique: true, partialFilterExpression: { email: { $ne: null } } })
> email?: string;
> ```
>
> `enableDynamicAPIIndexSync(app)` turns this into a loud boot failure (`Expression not supported in partial index: $not`) instead of a silent no-op — swap `$ne: null` for `$exists: true` (the working equivalent for this case, and MongoDB's own documented workaround).

---

## Hooks

Add pre/post hooks for lifecycle events to run custom logic before or after database operations.

### Available Hook Types

- `CreateOne` - Before/after creating a document
- `CreateMany` - Before/after creating multiple documents
- `UpdateOne` - Before/after updating a document
- `UpdateMany` - Before/after updating multiple documents
- `ReplaceOne` - Before/after replacing a document
- `DeleteOne` - Before/after deleting a document
- `DeleteMany` - Before/after deleting multiple documents
- `DuplicateOne` - Before/after duplicating a document
- `DuplicateMany` - Before/after duplicating multiple documents

### Pre Hook

Execute logic before an operation:

```typescript
@DynamicApiSchema({
  collection: 'users',
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: async function(this: any) {
        // Hash password before saving
        if (this.isModified('password')) {
          const bcrypt = require('bcrypt');
          this.password = await bcrypt.hash(this.password, 10);
        }
      },
    },
  ],
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}
```

### Post Hook

Execute logic after an operation:

```typescript
@DynamicApiSchema({
  collection: 'users',
  hooks: [
    {
      type: 'CreateOne',
      method: 'post',
      callback: async function(doc: any) {
        // Send welcome email after user creation
        console.log(`New user created: ${doc.email}`);
        // await emailService.sendWelcomeEmail(doc.email);
      },
    },
  ],
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;
}
```

### Multiple Hooks

```typescript
@DynamicApiSchema({
  collection: 'posts',
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: function(this: any) {
        this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
      },
    },
    {
      type: 'CreateOne',
      method: 'post',
      callback: async function(doc: any) {
        console.log(`Post created: ${doc.title}`);
      },
    },
    {
      type: 'UpdateOne',
      method: 'pre',
      callback: function(this: any) {
        if (this.isModified('title')) {
          this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
        }
      },
    },
    {
      type: 'DeleteOne',
      method: 'post',
      callback: async function(doc: any) {
        // Clean up related data
        console.log(`Post deleted: ${doc.title}`);
      },
    },
  ],
})
export class Post extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  slug: string;

  @Prop({ type: String, required: true })
  content: string;
}
```

### Hook Options

Control when hooks are triggered with `document` and `query` options:

```typescript
@DynamicApiSchema({
  collection: 'documents',
  hooks: [
    {
      type: 'UpdateOne',
      method: 'pre',
      callback: function(this: any) {
        console.log('Update hook triggered');
        this.updatedAt = new Date();
      },
      options: {
        document: true, // Run on document operations (e.g., doc.save())
        query: true,    // Run on query operations (e.g., Model.updateOne())
      },
    },
    {
      type: 'DeleteOne',
      method: 'pre',
      callback: function(this: any) {
        console.log('About to delete document');
      },
      options: {
        document: false, // Don't run on document.remove()
        query: true,     // Only run on Model.deleteOne()
      },
    },
  ],
})
export class Document extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;
}
```

**Default behavior:** If `options` is not specified, both `document` and `query` are set to `true`.

---

## Custom Initialization

Use `customInit` for advanced schema customization such as virtuals, methods, statics, and plugins.

### Virtual Properties

```typescript
@DynamicApiSchema({
  collection: 'users',
  customInit: (schema) => {
    // Add virtual property
    schema.virtual('fullName').get(function(this: any) {
      return `${this.firstName} ${this.lastName}`;
    });

    // Virtual with setter
    schema.virtual('fullName').set(function(this: any, value: string) {
      const parts = value.split(' ');
      this.firstName = parts[0];
      this.lastName = parts[1];
    });

    // Enable virtuals in JSON
    schema.set('toJSON', { virtuals: true });
    schema.set('toObject', { virtuals: true });
  },
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;
}
```

### Instance Methods

```typescript
@DynamicApiSchema({
  collection: 'users',
  customInit: (schema) => {
    // Add instance method
    schema.methods.getFullProfile = function() {
      return {
        id: this.id,
        name: this.name,
        email: this.email,
        joinedAt: this.createdAt,
      };
    };

    // Add async method
    schema.methods.verifyPassword = async function(password: string) {
      const bcrypt = require('bcrypt');
      return bcrypt.compare(password, this.password);
    };
  },
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}
```

### Static Methods

```typescript
@DynamicApiSchema({
  collection: 'users',
  customInit: (schema) => {
    // Add static method
    schema.statics.findByEmail = function(email: string) {
      return this.findOne({ email });
    };

    // Add async static method
    schema.statics.findActive = function() {
      return this.find({ isActive: true });
    };
  },
})
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
```

### Schema Plugins

You can add third-party Mongoose plugins for additional functionality.

> **Note:** Plugins are optional and require separate installation:
> ```bash
> npm install --save mongoose-paginate-v2 mongoose-slug-plugin
> ```

```typescript
import * as mongoosePaginate from 'mongoose-paginate-v2';
import * as mongooseSlugPlugin from 'mongoose-slug-plugin';

@DynamicApiSchema({
  collection: 'posts',
  customInit: (schema) => {
    // Add pagination plugin
    schema.plugin(mongoosePaginate);

    // Add slug plugin
    schema.plugin(mongooseSlugPlugin, { tmpl: '<%=title%>' });
  },
})
export class Post extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;
}
```

---

## Best Practices

### 1. Index Strategy

```typescript
// ✅ Good - Strategic indexes
@DynamicApiSchema({
  collection: 'users',
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },       // Unique lookup
    { fields: { createdAt: -1 } },                            // Sorting
    { fields: { category: 1, price: -1 } },                   // Common query
    { fields: { title: 'text', description: 'text' } },       // Search
  ],
})

// ❌ Avoid - Too many indexes
@DynamicApiSchema({
  collection: 'users',
  indexes: [
    { fields: { field1: 1 } },
    { fields: { field2: 1 } },
    { fields: { field3: 1 } },
    { fields: { field4: 1 } },
    // ... 20 more indexes
  ],
})
```

### 2. Hook Performance

```typescript
// ✅ Good - Efficient hooks
@DynamicApiSchema({
  collection: 'posts',
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: function(this: any) {
        // Fast synchronous operation
        this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
      },
    },
  ],
})

// ⚠️ Be careful - Async operations in hooks
@DynamicApiSchema({
  collection: 'posts',
  hooks: [
    {
      type: 'CreateOne',
      method: 'post',
      callback: async function(doc: any) {
        // Use queue for time-consuming tasks
        await emailQueue.add({ type: 'welcome', userId: doc.id });
      },
    },
  ],
})
```

### 3. Virtual Properties

```typescript
// ✅ Good - Computed properties
@DynamicApiSchema({
  collection: 'users',
  customInit: (schema) => {
    schema.virtual('age').get(function(this: any) {
      return Math.floor((Date.now() - this.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    });

    schema.set('toJSON', { virtuals: true });
  },
})
```

---

## Examples

### Complete Schema Configuration

```typescript
import { Prop } from '@nestjs/mongoose';
import { BaseEntity, DynamicApiSchema } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@DynamicApiSchema({
  collection: 'users',
  timestamps: true,

  // Indexes for performance
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
    { fields: { role: 1 } },
    { fields: { createdAt: -1 } },
    { fields: { isActive: 1, role: 1 } },
  ],

  // Lifecycle hooks
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: async function(this: any) {
        if (this.isModified('password')) {
          this.password = await bcrypt.hash(this.password, 10);
        }
      },
    },
    {
      type: 'CreateOne',
      method: 'post',
      callback: async function(doc: any) {
        console.log(`User created: ${doc.email}`);
      },
    },
    {
      type: 'UpdateOne',
      method: 'pre',
      callback: async function(this: any) {
        if (this.isModified('password')) {
          this.password = await bcrypt.hash(this.password, 10);
        }
      },
    },
  ],

  // Custom schema initialization
  customInit: (schema) => {
    // Virtual property
    schema.virtual('fullName').get(function(this: any) {
      return `${this.firstName} ${this.lastName}`;
    });

    // Instance method
    schema.methods.verifyPassword = async function(password: string) {
      return bcrypt.compare(password, this.password);
    };

    // Static method
    schema.statics.findByEmail = function(email: string) {
      return this.findOne({ email });
    };

    // Enable virtuals in JSON
    schema.set('toJSON', { virtuals: true });
    schema.set('toObject', { virtuals: true });
  },
})
export class User extends BaseEntity {
  @ApiProperty({ example: 'John' })
  @Prop({ type: String, required: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ type: String, required: true })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin', 'moderator'] })
  @Prop({ type: String, enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
```

---

## Related Documentation

- 🏗️ **[Entities](./entities.md)** - Learn about BaseEntity and SoftDeletableEntity
- 🔐 **[Authentication](./authentication.md)** - Password hashing examples
- ✅ **[Validation](./validation.md)** - Validate entity data

---

## Additional Resources

- [Mongoose Schema Documentation](https://mongoosejs.com/docs/guide.html)
- [Mongoose Indexes](https://mongoosejs.com/docs/guide.html#indexes)
- [Mongoose Middleware](https://mongoosejs.com/docs/middleware.html)
- [Mongoose Virtuals](https://mongoosejs.com/docs/tutorials/virtuals.html)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)


