<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

[![NPM version](https://img.shields.io/npm/v/mongodb-dynamic-api.svg)](https://www.npmjs.com/package/mongodb-dynamic-api)
![NPM](https://img.shields.io/npm/l/mongodb-dynamic-api?registry_uri=https%3A%2F%2Fregistry.npmjs.com)
![npm](https://img.shields.io/npm/dw/mongodb-dynamic-api)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![GitHub branch checks state](https://img.shields.io/github/checks-status/MikeDev75015/mongodb-dynamic-api/main)
[![CircleCI](https://circleci.com/gh/MikeDev75015/mongodb-dynamic-api.svg?style=shield)](https://app.circleci.com/pipelines/github/MikeDev75015/mongodb-dynamic-api)
![Sonar Quality Gate](https://img.shields.io/sonar/quality_gate/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![Sonar Tests](https://img.shields.io/sonar/tests/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
![Sonar Coverage](https://img.shields.io/sonar/coverage/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=security_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=ncloc)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![GitHub top language](https://img.shields.io/github/languages/top/MikeDev75015/mongodb-dynamic-api)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/MikeDev75015/mongodb-dynamic-api)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/MikeDev75015/mongodb-dynamic-api)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/MikeDev75015/mongodb-dynamic-api/main)
</div>
</div>

---

## mongodb-dynamic-api <img src="https://pbs.twimg.com/media/EDoWJbUXYAArclg.png" width="24" height="24" />

A powerful, production-ready NestJS module that automatically generates fully functional REST APIs with WebSocket support for MongoDB collections.

```bash
npm install --save mongodb-dynamic-api
```

---

<div style="text-align: center; width: 100%;">

# Dynamic API Module<br>with WebSockets

</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

---

## Overview

**mongodb-dynamic-api** is a flexible and highly configurable NestJS 11 module that dramatically accelerates API development by automatically generating complete CRUD operations for your MongoDB collections. Instead of writing repetitive boilerplate code, define your data models and let the module handle the rest.

The module provides:
- **Automatic CRUD generation** - Full REST API endpoints generated from your schemas
- **Real-time capabilities** - Built-in WebSocket support for live updates
- **Enterprise-ready features** - Authentication, authorization, caching, and validation out of the box
- **Developer-friendly** - Swagger documentation auto-generated for all endpoints
- **Highly customizable** - Fine-grained control at global, controller, and route levels

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🚀 **Zero Boilerplate** | Generate complete CRUD APIs from schema definitions |
| 🔐 **JWT Authentication** | Built-in authentication with 6 endpoints (login, register, get/update account, reset/change password) |
| 🛡️ **Authorization** | Role-based access control with ability predicates |
| ⚡ **Smart Caching** | Global caching with automatic invalidation |
| ✅ **Validation** | Global and per-route validation with class-validator |
| 📡 **WebSockets** | Socket.IO support for calling routes via WebSocket events |
| 📚 **Swagger UI** | Auto-generated OpenAPI documentation |
| 🔄 **Versioning** | URI-based API versioning |
| 🗑️ **Soft Delete** | Built-in soft delete with `SoftDeletableEntity` |
| 🔍 **Advanced Queries** | MongoDB queries + Aggregation pipelines for complex analytics |

---

## Installation

### Prerequisites

- Node.js >= 16.0.0
- NestJS >= 11.0.0
- MongoDB >= 4.0

### Create a New Project

Start a new NestJS project with TypeScript in strict mode:

```bash
nest new --strict your-project-name
cd your-project-name
```

### Install the Package

Install mongodb-dynamic-api (all dependencies are included):

```bash
npm install --save mongodb-dynamic-api
```

> **✨ Note:** All required dependencies are included in the package:
> - `@nestjs/mongoose` & `mongoose` - MongoDB integration
> - `@nestjs/jwt` & `@nestjs/passport` - Authentication
> - `@nestjs/swagger` - API documentation
> - `class-validator` & `class-transformer` - Validation & transformation
> - `@nestjs/cache-manager` & `cache-manager` - Caching
> - `@nestjs/websockets` & `socket.io` - Real-time support
>
> **No additional packages required** for any of the optional features (authentication, caching, websockets, validation, etc.).

---

## Quick Start

This guide will help you set up your first dynamic API in less than 5 minutes.

### Step 1: Configure the Root Module

Import `DynamicApiModule.forRoot()` in your `app.module.ts` and provide your MongoDB connection string:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb://localhost:27017/my-database', // MongoDB connection URI
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

> **💡 Tip:** Use environment variables for connection strings in production:
> ```typescript
> DynamicApiModule.forRoot(process.env.MONGODB_URI)
> ```

### Step 2: Define Your Entity

Create your first entity using Mongoose decorators. All entities must extend either `BaseEntity` or `SoftDeletableEntity`:

```typescript
// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
```

> **📝 Note:** 
> - `BaseEntity` provides `id`, `createdAt`, and `updatedAt` fields automatically
> - Timestamps are **automatically enabled** - no need to add `timestamps: true` in `@Schema()`
> - `_id` and `__v` are automatically excluded from JSON responses
> - See [Entities documentation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/entities.md) for more details

### Step 3: Create a Feature Module

Use `DynamicApiModule.forFeature()` to generate the API endpoints:

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
      },
    }),
  ],
})
export class UsersModule {}
```

### Step 4: Register the Feature Module

Add `UsersModule` to the imports array in `app.module.ts`:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb://localhost:27017/my-database',
    ),
    UsersModule, // Add your feature module here
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Step 5: Start Your Application

```bash
npm run start:dev
```

**🎉 Congratulations!** Your API is now running with complete CRUD operations at `http://localhost:3000/users`

---

## API Reference

Your generated API includes the following endpoints:

### Available Endpoints

| Endpoint | Method | Description | Request Body | Params | Query |
|:---------|:------:|:------------|:-------------|:-------|:------|
| `/users` | `GET` | Retrieve all users | - | - | MongoDB query object |
| `/users/:id` | `GET` | Retrieve a single user by ID | - | `id` | - |
| `/users/many` | `POST` | Create multiple users at once | `{ list: User[] }` | - | - |
| `/users` | `POST` | Create a single user | `User` | - | - |
| `/users/:id` | `PUT` | Replace a user completely | `User` | `id` | - |
| `/users` | `PATCH` | Update multiple users | `Partial<User>` | - | `ids[]` |
| `/users/:id` | `PATCH` | Update a single user partially | `Partial<User>` | `id` | - |
| `/users` | `DELETE` | Delete multiple users | - | - | `ids[]` |
| `/users/:id` | `DELETE` | Delete a single user | - | `id` | - |
| `/users/duplicate` | `POST` | Duplicate multiple users with updates | `Partial<User>` | - | `ids[]` |
| `/users/duplicate/:id` | `POST` | Duplicate a single user with updates | `Partial<User>` | `id` | - |
| `/users/aggregate` | `GET` | Execute MongoDB aggregation pipeline | - | - | Query DTO params |

> **💡 Note:** The `Aggregate` route requires a custom Query DTO with a `toPipeline` static method. See [Advanced Queries documentation](#advanced-queries-with-aggregate) below.

### Request Examples

#### Get Many Users

```bash
# Get all users
GET /users

# Query parameters are passed directly to MongoDB find()
# You can use any valid MongoDB query
GET /users?isActive=true&name=John
```

#### Create One User

```bash
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "isActive": true
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "isActive": true,
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

#### Create Many Users

```bash
POST /users/many
Content-Type: application/json

{
  "list": [
    {
      "name": "Alice Smith",
      "email": "alice@example.com"
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com"
    }
  ]
}
```

**Response (201 Created):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "isActive": true,
    "createdAt": "2026-02-21T10:30:00.000Z",
    "updatedAt": "2026-02-21T10:30:00.000Z"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "name": "Bob Johnson",
    "email": "bob@example.com",
    "isActive": true,
    "createdAt": "2026-02-21T10:30:00.000Z",
    "updatedAt": "2026-02-21T10:30:00.000Z"
  }
]
```

#### Update One User

```bash
PATCH /users/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "phone": "+0987654321",
  "isActive": false
}
```

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+0987654321",
  "isActive": false,
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:35:00.000Z"
}
```

#### Duplicate One User

```bash
POST /users/duplicate/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "email": "john.doe.copy@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439013",
  "name": "John Doe",
  "email": "john.doe.copy@example.com",
  "phone": "+0987654321",
  "isActive": false,
  "createdAt": "2026-02-21T10:40:00.000Z",
  "updatedAt": "2026-02-21T10:40:00.000Z"
}
```

---

## Advanced Features

The module supports powerful customization options. Here are some quick examples:

### Advanced Queries with Aggregate

The `Aggregate` route type enables **MongoDB aggregation pipelines** for complex queries, analytics, and data transformations. This is perfect for:
- Grouping and counting data
- Calculating statistics (sum, average, min, max)
- Joining related collections with `$lookup`
- Complex filtering and transformations
- Pagination with counting

**Key Requirements:**
1. You **must** provide a custom Query DTO
2. The Query DTO **must** have a static `toPipeline` method
3. The method returns an array of MongoDB pipeline stages
4. Optionally provide a custom Presenter with `fromAggregate` method

**Example - User Statistics:**

```typescript
// src/users/dtos/user-stats.query.ts
import { IsOptional, IsString } from 'class-validator';
import { PipelineStage } from 'mongodb-pipeline-builder';

export class UserStatsQuery {
  @IsOptional()
  @IsString()
  status?: string;

  static toPipeline(query: UserStatsQuery): PipelineStage[] {
    const pipeline: PipelineStage[] = [];

    // Filter by status if provided
    if (query.status) {
      pipeline.push({ $match: { isActive: query.status === 'active' } });
    }

    // Group by creation date (year-month)
    pipeline.push({
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
        users: { $push: { id: '$_id', name: '$name', email: '$email' } },
      },
    });

    // Sort by date
    pipeline.push({
      $sort: { '_id.year': -1, '_id.month': -1 },
    });

    return pipeline;
  }
}

// src/users/dtos/user-stats.presenter.ts
export class UserStatsPresenter {
  period: string;
  count: number;
  users: { id: string; name: string; email: string }[];

  static fromAggregate(results: any[]): UserStatsPresenter[] {
    return results.map(result => ({
      period: `${result._id.year}-${String(result._id.month).padStart(2, '0')}`,
      count: result.count,
      users: result.users,
    }));
  }
}

// src/users/users.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: { path: 'users' },
      routes: [
        {
          type: 'Aggregate',
          subPath: 'stats',
          dTOs: {
            query: UserStatsQuery,
            presenter: UserStatsPresenter,
          },
        },
      ],
    }),
  ],
})
export class UsersModule {}
```

**Usage:**
```bash
# Get all user statistics
GET /users/aggregate/stats

# Filter by active users
GET /users/aggregate/stats?status=active
```

**With Pagination Support:**

The Aggregate route automatically detects pagination when your pipeline starts with a `$facet` stage:

```typescript
import { Type } from 'class-transformer';
import { IsOptional, IsNumber } from 'class-validator';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';

export class PaginatedUsersQuery {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  static toPipeline(query: PaginatedUsersQuery): PipelineStage[] {
    const builder = new PipelineBuilder('paginated-users');

    // Using method chaining - all methods return the builder
    return builder
      .Match({ isActive: true })  // Add your filters
      .Paging(query.limit, query.page)  // Paging(elementsPerPage, page)
      .build();  // Build and return the pipeline array
  }
}
```

**Response with pagination:**
```json
{
  "list": [...],
  "count": 150,
  "totalPage": 15
}
```

> 📚 **Learn More:** The module uses [`mongodb-pipeline-builder`](https://www.npmjs.com/package/mongodb-pipeline-builder) (by the same author) to greatly simplify building aggregation pipelines with:
> - **Fluent API** - Chain methods for readable pipeline construction
> - **Type Safety** - Full TypeScript support with IntelliSense
> - **Automatic Pagination** - Built-in support for `$facet` with counting via `Paging()` method
> - **Stage Methods** - Pre-built methods: `Match()`, `Group()`, `Lookup()`, `Sort()`, `Project()`, `AddFields()`, etc.
> - **Operators** - Import operators like `$Sum()`, `$Average()`, `$First()`, `$Max()`, `$Push()`, etc.
> - **Helpers** - Utility functions: `LookupEqualityHelper()`, `ProjectOnlyHelper()`, `Field()`, etc.
> - **No manual stage objects** - Write `builder.Match({ field: value })` instead of `{ $match: { field: value } }`
>
> **Example with operators and helpers:**
> ```typescript
> import { PipelineBuilder } from 'mongodb-pipeline-builder';
> import { $Sum, $Average, $First, $Push } from 'mongodb-pipeline-builder/operators';
> import { Field, ProjectOnlyHelper, LookupEqualityHelper } from 'mongodb-pipeline-builder/helpers';
> 
> const pipeline = new PipelineBuilder('my-pipeline')
>   .Match({ status: 'active' })
>   .Project(ProjectOnlyHelper('name', 'email', 'orders'))
>   .Lookup(LookupEqualityHelper('orders', 'userOrders', '_id', 'userId'))
>   .Group({
>     _id: '$department',
>     totalUsers: $Sum(1),
>     avgOrderValue: $Average('$orders.total'),
>     firstUser: $First('$name'),
>     allEmails: $Push('$email'),
>   })
>   .AddFields(
>     Field('calculatedField', { $multiply: ['$totalUsers', 10] })
>   )
>   .Sort({ totalUsers: -1 })
>   .Paging(10, 1)  // 10 per page, page 1
>   .build();
> ```
>
> This makes complex pipelines much easier to write and maintain!

**Advanced Example - Join Collections with $lookup:**

```typescript
// src/orders/dtos/order-analytics.query.ts
import { IsOptional, IsDateString } from 'class-validator';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';
import { $First, $Sum, $Average } from 'mongodb-pipeline-builder/operators';
import { LookupEqualityHelper } from 'mongodb-pipeline-builder/helpers';

export class OrderAnalyticsQuery {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  static toPipeline(query: OrderAnalyticsQuery): PipelineStage[] {
    // Using PipelineBuilder (simplified approach - recommended)
    const builder = new PipelineBuilder('order-analytics');

    // Filter by date range
    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      builder.Match({ createdAt: dateFilter });
    }

    // Using method chaining with helpers for readable pipeline construction
    return builder
      .Lookup(LookupEqualityHelper('users', 'user', 'userId', '_id'))  // Join with users
      .Unwind('$user')  // Unwind user array
      .Lookup(LookupEqualityHelper('products', 'products', 'items.productId', '_id'))  // Join with products
      .Group({  // Group by user and calculate totals using operators
        _id: '$userId',
        userName: $First('$user.name'),
        userEmail: $First('$user.email'),
        orderCount: $Sum(1),
        totalAmount: $Sum('$total'),
        avgOrderValue: $Average('$total'),
      })
      .Sort({ totalAmount: -1 })  // Sort by total amount descending
      .build();  // Build and return the pipeline

    /* Manual approach (without PipelineBuilder and helpers):
    const pipeline: PipelineStage[] = [];
    
    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      pipeline.push({ $match: { createdAt: dateFilter } });
    }

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    });

    pipeline.push({ $unwind: '$user' });

    pipeline.push({
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'products',
      },
    });

    pipeline.push({
      $group: {
        _id: '$userId',
        userName: { $first: '$user.name' },
        userEmail: { $first: '$user.email' },
        orderCount: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
      },
    });

    pipeline.push({ $sort: { totalAmount: -1 } });

    return pipeline;
    
    Compare with PipelineBuilder approach:
    - LookupEqualityHelper() vs verbose $lookup object
    - $First(), $Sum(), $Average() vs raw MongoDB operators
    - Method chaining vs array.push()
    - Much more readable and maintainable!
    */
  }
}

// src/orders/dtos/order-analytics.presenter.ts
export class OrderAnalyticsPresenter {
  userId: string;
  userName: string;
  userEmail: string;
  orderCount: number;
  totalAmount: number;
  avgOrderValue: number;

  static fromAggregate(results: any[]): OrderAnalyticsPresenter[] {
    return results.map(result => ({
      userId: result._id,
      userName: result.userName,
      userEmail: result.userEmail,
      orderCount: result.orderCount,
      totalAmount: Math.round(result.totalAmount * 100) / 100,
      avgOrderValue: Math.round(result.avgOrderValue * 100) / 100,
    }));
  }
}

// Usage
GET /orders/aggregate/analytics?startDate=2026-01-01&endDate=2026-12-31
```

**Response:**
```json
[
  {
    "userId": "507f1f77bcf86cd799439011",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "orderCount": 15,
    "totalAmount": 2450.50,
    "avgOrderValue": 163.37
  },
  {
    "userId": "507f1f77bcf86cd799439012",
    "userName": "Jane Smith",
    "userEmail": "jane@example.com",
    "orderCount": 12,
    "totalAmount": 1850.75,
    "avgOrderValue": 154.23
  }
]
```

### Route Configuration

Control which routes are generated and customize individual routes:

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    apiTag: 'Users Management',
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'CreateOne', validationPipeOptions: { whitelist: true } },
    { type: 'UpdateOne' },
    { type: 'DeleteOne' },
    // Exclude specific routes
    { type: 'DeleteMany', excluded: true },
  ],
})
```

### Enable Soft Delete

Use `SoftDeletableEntity` for soft delete functionality:

```typescript
import { SoftDeletableEntity } from 'mongodb-dynamic-api';

@Schema({ collection: 'users' })
export class User extends SoftDeletableEntity {
  @Prop({ type: String, required: true })
  name: string;
  // ... other fields
}
```

Deleted entities are marked with `isDeleted: true` instead of being removed.

> 📚 **Learn More:** See detailed guides in the [Optional Features](#optional-features-all-dependencies-included) section below.

---

## Best Practices

### 1. Use Environment Variables

Always use environment variables for sensitive configuration:

```typescript
DynamicApiModule.forRoot(process.env.MONGODB_URI)
```

### 2. Add Validation

Use class-validator decorators on your entities:

```typescript
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsNotEmpty()
  @Length(2, 100)
  @Prop({ type: String, required: true })
  name: string;

  @IsEmail()
  @Prop({ type: String, required: true, unique: true })
  email: string;
}
```

### 3. Optimize with Indexes

Define indexes for frequently queried fields:

```typescript
import { DynamicAPISchemaOptions } from 'mongodb-dynamic-api';

@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
    { fields: { createdAt: -1 } },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  // ...
}
```

> 📚 **Learn More:** See [Schema Options](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/schema-options.md) and [Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md) guides.

---

## Learn More

Explore advanced features and configurations:

### Core Concepts

- **[Entities](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/entities.md)** - Learn about BaseEntity and SoftDeletableEntity (timestamps auto-enabled)
- **[Schema Options](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/schema-options.md)** - Configure indexes, hooks with options (document/query), and custom initialization

### Optional Features (All Dependencies Included)

| Feature | Description | Documentation |
|---------|-------------|---------------|
| 📚 **Swagger UI** | Auto-generated OpenAPI documentation | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md) |
| 🔄 **Versioning** | URI-based API versioning | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md) |
| ✅ **Validation** | Request validation with class-validator | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md) |
| ⚡ **Caching** | Global caching with auto-invalidation | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md) |
| 🔐 **Authentication** | JWT authentication (6 endpoints) | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md) |
| 🛡️ **Authorization** | Role-based access control | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md) |
| 📡 **WebSockets** | Socket.IO integration for routes | [View Guide](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md) |

### Important Notes

- **Timestamps**: Automatically enabled when entity extends `BaseEntity` (provides `createdAt` and `updatedAt`)
- **Soft Delete**: Use `SoftDeletableEntity` to add `isDeleted` and `deletedAt` fields
- **Version Format**: Must be numeric strings (`'1'`, `'2'`), not semantic versioning
- **WebSocket Events**: 
  - Auth events have fixed names: `auth-login`, `auth-register`, `auth-get-account`, `auth-update-account`, `auth-reset-password`, `auth-change-password`
  - CRUD events are generated from entity name or `apiTag`: `kebabCase(routeType + '/' + displayedName)`
- **Ability Predicates**: Signature varies by context:
  - Auth routes: `(user, body?) => boolean`
  - CRUD routes: `(entity, user) => boolean`

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---


**Made with ❤️ by [Mickaël NODANCHE](https://cv-mikeonline.web.app)**



