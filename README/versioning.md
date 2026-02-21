[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Versioning

Enable API versioning to maintain backward compatibility while evolving your API. Support multiple versions simultaneously with URI-based versioning.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Levels](#configuration-levels)
  - [Controller-Level Versioning](#controller-level-versioning)
  - [Route-Level Versioning](#route-level-versioning)
- [Versioning Strategies](#versioning-strategies)
  - [Versioning Types](#versioning-types)
  - [Implementation Strategies](#implementation-strategies)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Enable Versioning

Add versioning in your `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIVersioning } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable URI versioning
  enableDynamicAPIVersioning(app);
  
  await app.listen(3000);
  console.log('🚀 Application: http://localhost:3000');
  console.log('📍 Version 1: http://localhost:3000/v1/users');
  console.log('📍 Version 2: http://localhost:3000/v2/users');
}
bootstrap();
```

### Add Versions to Controllers

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    version: '1', // This controller is version 1
  },
})
```

**🎉 Done!** Your API is now accessible at `/v1/users`

---

## Configuration Levels

### Controller-Level Versioning

Apply version to all routes in a controller:

```typescript
// Version 1
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    version: '1',
  },
})

// Version 2 with enhanced features
DynamicApiModule.forFeature({
  entity: UserV2,
  controllerOptions: {
    path: 'users',
    version: '2',
  },
})
```

### Route-Level Versioning

Override controller version for specific routes:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    version: '1', // Default version for all routes
  },
  routes: [
    {
      type: 'GetMany',
      version: '1',
    },
    {
      type: 'GetOne',
      version: '1',
    },
    {
      type: 'CreateOne',
      version: '2', // This route is only available in v2
    },
    {
      type: 'UpdateOne',
      version: '1', // Override to use version 1
    },
  ],
})
```

> **Note:** To have the same route available in multiple versions, you need to define the route configuration multiple times with different versions, or create separate controller modules for each version.

---

## Versioning Strategies

mongodb-dynamic-api uses NestJS versioning under the hood, with **URI versioning** as the default strategy.

### Versioning Types

#### 1. URI Versioning (Default)

Version is specified in the URL path:

```typescript
// src/main.ts
enableDynamicAPIVersioning(app);
// Creates routes like: /v1/users, /v2/users

DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    version: '1',
  },
})
```

**URLs:**
- `/v1/users` - Version 1
- `/v2/users` - Version 2

#### 2. Header Versioning

Version is specified in a custom header:

```typescript
// src/main.ts
import { VersioningType } from '@nestjs/common';

enableDynamicAPIVersioning(app, {
  type: VersioningType.HEADER,
  header: 'X-API-Version',
});
```

**Client usage:**
```bash
curl -H "X-API-Version: 1" http://localhost:3000/users
curl -H "X-API-Version: 2" http://localhost:3000/users
```

#### 3. Media Type Versioning

Version is specified in the Accept header:

```typescript
// src/main.ts
import { VersioningType } from '@nestjs/common';

enableDynamicAPIVersioning(app, {
  type: VersioningType.MEDIA_TYPE,
  key: 'v=',
});
```

**Client usage:**
```bash
curl -H "Accept: application/json;v=1" http://localhost:3000/users
curl -H "Accept: application/json;v=2" http://localhost:3000/users
```

#### 4. Custom Versioning

Implement your own versioning logic:

```typescript
// src/main.ts
import { VersioningType } from '@nestjs/common';

enableDynamicAPIVersioning(app, {
  type: VersioningType.CUSTOM,
  extractor: (request) => {
    // Extract version from subdomain, query param, etc.
    return request.headers['custom-version'] || '1';
  },
});
```

### Implementation Strategies

### Strategy 1: Complete Controller Duplication

Create separate controllers for each version:

```typescript
// src/users/v1/user-v1.entity.ts
@Schema({ collection: 'users' })
export class UserV1 extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}

// src/users/v1/users-v1.module.ts
DynamicApiModule.forFeature({
  entity: UserV1,
  controllerOptions: {
    path: 'users',
    version: '1',
  },
})

// src/users/v2/user-v2.entity.ts
@Schema({ collection: 'users' })
export class UserV2 extends BaseEntity {
  @Prop({ type: String, required: true })
  firstName: string; // Changed from 'name' to 'firstName'

  @Prop({ type: String, required: true })
  lastName: string; // New field

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String }) // New field
  phone?: string;
}

// src/users/v2/users-v2.module.ts
DynamicApiModule.forFeature({
  entity: UserV2,
  controllerOptions: {
    path: 'users',
    version: '2',
  },
})
```

**URLs:**
- Version 1: `POST /v1/users` (expects `name`, `email`)
- Version 2: `POST /v2/users` (expects `firstName`, `lastName`, `email`, `phone`)

### Strategy 2: Selective Route Versioning

Version only specific routes that change:

```typescript
// src/products/products.module.ts
// V1 Controller
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    version: '1',
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'CreateOne' },
  ],
})

// V2 Controller - Only override routes that changed
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    version: '2',
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    {
      type: 'CreateOne',
      // V2 has stricter validation
      validationPipeOptions: {
        whitelist: true,
        forbidNonWhitelisted: true,
      },
    },
  ],
})
```

**URLs:**
- `GET /v1/products` - Available
- `GET /v2/products` - Available (same behavior)
- `POST /v1/products` - Old validation
- `POST /v2/products` - Strict validation

### Strategy 3: Gradual Migration

Maintain backward compatibility while introducing new features:

```typescript
// V1 - Basic features
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
    version: '1',
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'CreateOne' },
    { type: 'UpdateOne' },
  ],
})

// V2 - Add new routes
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
    version: '2',
  },
  routes: [
    { type: 'GetMany' },
    { type: 'GetOne' },
    { type: 'CreateOne' },
    { type: 'UpdateOne' },
    { type: 'CreateMany' }, // New in v2
    { type: 'UpdateMany' }, // New in v2
  ],
})
```

---

## Best Practices

### 1. Version Naming Convention

**Version must be a string containing only digits** (validated by `/^\d+$/`):

```typescript
// ✅ Good - Numeric versions only
version: '1'
version: '2'
version: '10'
version: '100'

// ❌ Invalid - Will throw error
version: 'v1'      // Contains non-numeric characters
version: '1.0'     // Contains dot
version: '1.2.3'   // Contains dots
version: 'alpha'   // Not numeric
version: 'beta'    // Not numeric
version: 'latest'  // Not numeric
```

**Why numeric only?**
- Consistent URL structure: `/v1/users`, `/v2/users`
- Easy to validate and compare
- Clear upgrade path
- No ambiguity

### 2. Deprecation Strategy

```typescript
// V1 - Mark as deprecated in documentation
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    version: '1',
    description: '⚠️ DEPRECATED: Please use v2. This version will be removed on 2026-12-31.',
  },
})

// V2 - Current version
DynamicApiModule.forFeature({
  entity: UserV2,
  controllerOptions: {
    path: 'users',
    version: '2',
    description: 'Current stable version',
  },
})
```

### 3. Breaking Changes

Only introduce breaking changes in new major versions:

```typescript
// V1 - Original structure
{
  "id": "123",
  "user_name": "john_doe", // snake_case
  "created_at": "2026-02-21"
}

// V2 - Breaking change (different naming convention)
{
  "id": "123",
  "userName": "john_doe", // camelCase
  "createdAt": "2026-02-21T10:30:00.000Z" // ISO 8601
}
```

### 4. Default Version

Set a default version for unversioned requests:

```typescript
// src/main.ts
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1', // Default to v1 if no version specified
  });

  await app.listen(3000);
}
bootstrap();
```

### 5. Documentation Per Version

```typescript
// Generate separate Swagger docs for each version
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // V1 Documentation
  const v1Config = new DocumentBuilder()
    .setTitle('API v1')
    .setVersion('1.0')
    .setDescription('API Version 1 (Deprecated)')
    .build();
  const v1Document = SwaggerModule.createDocument(app, v1Config, {
    include: [UsersV1Module, ProductsV1Module],
  });
  SwaggerModule.setup('api/v1/docs', app, v1Document);

  // V2 Documentation
  const v2Config = new DocumentBuilder()
    .setTitle('API v2')
    .setVersion('2.0')
    .setDescription('API Version 2 (Current)')
    .build();
  const v2Document = SwaggerModule.createDocument(app, v2Config, {
    include: [UsersV2Module, ProductsV2Module],
  });
  SwaggerModule.setup('api/v2/docs', app, v2Document);

  await app.listen(3000);
}
```

---

## Examples

### Complete Versioning Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { enableDynamicAPIVersioning, enableDynamicAPISwagger } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable versioning
  enableDynamicAPIVersioning(app, {
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable Swagger
  enableDynamicAPISwagger(app);

  await app.listen(3000);
  console.log('🚀 API v1: http://localhost:3000/v1');
  console.log('🚀 API v2: http://localhost:3000/v2');
  console.log('📚 Docs: http://localhost:3000/dynamic-api');
}
bootstrap();

// src/users/v1/user-v1.entity.ts
@Schema({ collection: 'users' })
export class UserV1 extends BaseEntity {
  @ApiProperty({ example: 'John Doe' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Prop({ type: String, required: true })
  email: string;
}

// src/users/v1/users-v1.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: UserV1,
      controllerOptions: {
        path: 'users',
        version: '1',
        description: 'User management endpoints (v1 - deprecated)',
      },
    }),
  ],
})
export class UsersV1Module {}

// src/users/v2/user-v2.entity.ts
@Schema({ collection: 'users' })
export class UserV2 extends BaseEntity {
  @ApiProperty({ example: 'John' })
  @Prop({ type: String, required: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ type: String, required: true })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Prop({ type: String, required: true })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @Prop({ type: String })
  phone?: string;

  @ApiProperty({ example: 'user' })
  @Prop({ type: String, default: 'user' })
  role: string;
}

// src/users/v2/users-v2.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: UserV2,
      controllerOptions: {
        path: 'users',
        version: '2',
        description: 'User management endpoints (v2 - current)',
      },
    }),
  ],
})
export class UsersV2Module {}

// src/app.module.ts
@Module({
  imports: [
    DynamicApiModule.forRoot(process.env.MONGODB_URI),
    UsersV1Module,
    UsersV2Module,
  ],
})
export class AppModule {}
```

### API Responses Comparison

**V1 Response:**
```bash
GET /v1/users/507f1f77bcf86cd799439011

{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

**V2 Response:**
```bash
GET /v2/users/507f1f77bcf86cd799439011

{
  "id": "507f1f77bcf86cd799439011",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "role": "user",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

---

## Migration Guide

### For Clients

```typescript
// Old client code (v1)
async function getUser(id: string) {
  const response = await fetch(`http://api.example.com/v1/users/${id}`);
  const user = await response.json();
  console.log(user.name); // Single name field
}

// New client code (v2)
async function getUser(id: string) {
  const response = await fetch(`http://api.example.com/v2/users/${id}`);
  const user = await response.json();
  console.log(`${user.firstName} ${user.lastName}`); // Separate name fields
}
```

---

## Related Documentation

- 📚 **[Swagger UI](./swagger-ui.md)** - Version-specific documentation
- 🏗️ **[Entities](./entities.md)** - Define versioned entities
- ✅ **[Validation](./validation.md)** - Version-specific validation

---

## Additional Resources

- [NestJS Versioning Documentation](https://docs.nestjs.com/techniques/versioning)
- [API Versioning Best Practices](https://www.freecodecamp.org/news/rest-api-best-practices-rest-endpoint-design-examples/)
- [Semantic Versioning](https://semver.org/)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)






