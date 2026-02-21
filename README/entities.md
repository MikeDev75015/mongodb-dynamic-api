[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Entities

Entities are the foundation of your dynamic API. They define the structure of your data and automatically generate the corresponding MongoDB schemas and API endpoints.

## 📋 Table of Contents

- [BaseEntity](#baseentity)
- [SoftDeletableEntity](#softdeletableentity)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## BaseEntity

The `BaseEntity` class provides a consistent interface for all entities with automatic timestamp management and MongoDB-to-JSON transformation.

### Structure

```typescript
export abstract class BaseEntity {
  @Exclude()
  _id: ObjectId;

  @Exclude()
  __v: number;

  @ApiProperty({ description: 'Unique identifier', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-21T10:30:00.000Z' })
  @Prop({ type: Date })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-21T10:35:00.000Z' })
  @Prop({ type: Date })
  updatedAt: Date;
}
```

### Fields Explanation

| Field | Type | Description | Visibility |
|-------|------|-------------|------------|
| `_id` | `ObjectId` | MongoDB internal identifier | Excluded from API responses |
| `__v` | `number` | Mongoose version key | Excluded from API responses |
| `id` | `string` | String representation of `_id` | Included in API responses |
| `createdAt` | `Date` | Automatically set on creation | Included in API responses |
| `updatedAt` | `Date` | Automatically updated on modification | Included in API responses |

**Important Notes:**

- **Timestamps:** If your entity extends `BaseEntity` or `SoftDeletableEntity`, timestamps are **automatically enabled** by the library. You don't need to add `timestamps: true` in `@Schema()` decorator.
- **Exclusion:** `_id` and `__v` are automatically excluded from JSON responses using `@Exclude()` decorator from `class-transformer`.
- **ID Transformation:** The `id` field is automatically populated from `_id` when documents are returned.

### Usage

Extend `BaseEntity` for all your entities:

```typescript
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty({ example: 'John Doe' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Prop({ type: String, required: true, unique: true })
  email: string;
}
```

### Example Response

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

**Note:** `_id` and `__v` are automatically excluded from JSON responses.

---

## SoftDeletableEntity

The `SoftDeletableEntity` extends `BaseEntity` and adds soft delete functionality. Instead of permanently removing documents, they are marked as deleted.

### Structure

```typescript
export abstract class SoftDeletableEntity extends BaseEntity {
  @Exclude()
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @ApiProperty({ 
    description: 'Deletion timestamp', 
    example: '2026-02-21T10:40:00.000Z',
    nullable: true 
  })
  @Prop({ type: Date, nullable: true })
  deletedAt: Date | null;
}
```

### Additional Fields

| Field | Type | Description | Visibility |
|-------|------|-------------|------------|
| `isDeleted` | `boolean` | Marks document as deleted | Excluded from API responses |
| `deletedAt` | `Date \| null` | Timestamp when document was deleted | Included in API responses |

### Usage

Extend `SoftDeletableEntity` for entities that should support soft delete:

```typescript
import { Prop, Schema } from '@nestjs/mongoose';
import { SoftDeletableEntity } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'posts' })
export class Post extends SoftDeletableEntity {
  @ApiProperty({ example: 'My Blog Post' })
  @Prop({ type: String, required: true })
  title: string;

  @ApiProperty({ example: 'This is the content of my blog post...' })
  @Prop({ type: String, required: true })
  content: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Prop({ type: String, required: true })
  authorId: string;
}
```

### Soft Delete Behavior

#### Before Deletion

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "My Blog Post",
  "content": "This is the content...",
  "authorId": "507f1f77bcf86cd799439012",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z",
  "deletedAt": null
}
```

#### After Deletion (DELETE /posts/507f1f77bcf86cd799439011)

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "My Blog Post",
  "content": "This is the content...",
  "authorId": "507f1f77bcf86cd799439012",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:40:00.000Z",
  "deletedAt": "2026-02-21T10:40:00.000Z"
}
```

**Important:** Soft-deleted documents are automatically excluded from GET requests.

---

## Best Practices

### 1. Choose the Right Base Class

```typescript
// Use BaseEntity for permanent data
@Schema({ collection: 'settings' })
export class Setting extends BaseEntity {
  // Settings should be permanently deleted
}

// Use SoftDeletableEntity for user data
@Schema({ collection: 'posts' })
export class Post extends SoftDeletableEntity {
  // Posts can be recovered if soft-deleted
}
```

### 2. Add API Documentation

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @ApiProperty({ 
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
    minLength: 3,
    maxLength: 200,
  })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ 
    description: 'Product price in USD',
    example: 1299.99,
    minimum: 0,
  })
  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'High-performance laptop for professionals',
  })
  @Prop({ type: String })
  description?: string;
}
```

### 3. Use Validation Decorators

```typescript
import { IsNotEmpty, IsEmail, IsNumber, Min, Max, Length } from 'class-validator';

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @ApiProperty({ example: 'Laptop' })
  @IsNotEmpty()
  @Length(3, 200)
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @Prop({ type: Number, required: true })
  price: number;
}
```

### 4. Define Proper Indexes

```typescript
import { DynamicAPISchemaOptions } from 'mongodb-dynamic-api';

@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
    { fields: { name: 1 } },
    { fields: { createdAt: -1 } },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;
}
```

### 5. Use TypeScript Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true
  }
}

// Entity with optional fields
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  phone?: string; // Use optional operator for non-required fields

  @Prop({ type: String, nullable: true })
  middleName: string | null; // Use union type for nullable fields
}
```

---

## Examples

### Complete Entity Example

```typescript
// src/products/product.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { SoftDeletableEntity, DynamicAPISchemaOptions } from 'mongodb-dynamic-api';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max, Length } from 'class-validator';

@DynamicAPISchemaOptions({
  indexes: [
    { fields: { name: 1 } },
    { fields: { category: 1, price: 1 } },
    { fields: { createdAt: -1 } },
  ],
})
@Schema({ collection: 'products' })
export class Product extends SoftDeletableEntity {
  @ApiProperty({ 
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
    minLength: 3,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'Product name is required' })
  @Length(3, 200, { message: 'Product name must be between 3 and 200 characters' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'High-performance laptop for professionals',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Prop({ type: String })
  description?: string;

  @ApiProperty({ 
    description: 'Product price in USD',
    example: 1299.99,
    minimum: 0,
    maximum: 1000000,
  })
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  @Max(1000000, { message: 'Price cannot exceed 1,000,000' })
  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @ApiProperty({ 
    description: 'Product category',
    example: 'Electronics',
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
  })
  @IsNotEmpty()
  @Prop({ 
    type: String, 
    required: true,
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
  })
  category: string;

  @ApiProperty({ 
    description: 'Stock quantity',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stock: number;

  @ApiProperty({ 
    description: 'Product availability status',
    example: true,
    default: true,
  })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiPropertyOptional({ 
    description: 'Product image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
  })
  @IsOptional()
  @Prop({ type: [String], default: [] })
  images?: string[];

  @ApiPropertyOptional({ 
    description: 'Product tags',
    example: ['laptop', 'dell', 'xps', 'high-performance'],
    type: [String],
  })
  @IsOptional()
  @Prop({ type: [String], default: [] })
  tags?: string[];
}
```

### Entity with Relationships

```typescript
// src/orders/order.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class OrderItem {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  productId: string;

  @ApiProperty({ example: 'Laptop Dell XPS 15' })
  productName: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1299.99 })
  price: number;
}

@Schema({ collection: 'orders' })
export class Order extends BaseEntity {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Prop({ type: String, required: true })
  userId: string;

  @ApiProperty({ 
    type: [OrderItem],
    description: 'List of items in the order',
  })
  @Type(() => OrderItem)
  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @ApiProperty({ example: 2599.98 })
  @Prop({ type: Number, required: true })
  totalAmount: number;

  @ApiProperty({ example: 'pending', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] })
  @Prop({ 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;
}
```

---

## Related Documentation

- 🔧 **[Schema Options](./schema-options.md)** - Configure indexes, hooks, and custom initialization
- ✅ **[Validation](./validation.md)** - Validate entity data
- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation

---

## Additional Resources

- [Mongoose Schema Documentation](https://mongoosejs.com/docs/guide.html)
- [Class Validator Documentation](https://github.com/typestack/class-validator)
- [Class Transformer Documentation](https://github.com/typestack/class-transformer)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)



