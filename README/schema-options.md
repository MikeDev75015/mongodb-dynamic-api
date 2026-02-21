[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Schema Options

Configure advanced Mongoose schema features using the `@DynamicAPISchemaOptions` decorator. This allows you to add indexes, lifecycle hooks, and custom schema initialization.

## 📋 Table of Contents

- [Indexes](#indexes)
- [Hooks](#hooks)
- [Custom Initialization](#custom-initialization)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Indexes

Define indexes to optimize query performance and enforce data constraints.

### Basic Index

```typescript
import { DynamicAPISchemaOptions } from 'mongodb-dynamic-api';

@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;
}
```

### Multiple Indexes

```typescript
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'products' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'sessions' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;
}
```

### Multiple Hooks

```typescript
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'posts' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'documents' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;
}
```

### Instance Methods

```typescript
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users' })
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
@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users' })
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

@DynamicAPISchemaOptions({
  customInit: (schema) => {
    // Add pagination plugin
    schema.plugin(mongoosePaginate);

    // Add slug plugin
    schema.plugin(mongooseSlugPlugin, { tmpl: '<%=title%>' });
  },
})
@Schema({ collection: 'posts' })
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
@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },       // Unique lookup
    { fields: { createdAt: -1 } },                            // Sorting
    { fields: { category: 1, price: -1 } },                   // Common query
    { fields: { title: 'text', description: 'text' } },       // Search
  ],
})

// ❌ Avoid - Too many indexes
@DynamicAPISchemaOptions({
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
@DynamicAPISchemaOptions({
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
@DynamicAPISchemaOptions({
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
@DynamicAPISchemaOptions({
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
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity, DynamicAPISchemaOptions } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@DynamicAPISchemaOptions({
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
@Schema({ collection: 'users', timestamps: true })
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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)



