[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Swagger UI

Automatically generate comprehensive API documentation with Swagger UI. The documentation is interactive and reflects all your generated endpoints.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Customization](#customization)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Enable Swagger UI

Add a single function call in your `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPISwagger } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable Swagger documentation
  enableDynamicAPISwagger(app);
  
  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('📚 Swagger documentation: http://localhost:3000/dynamic-api');
}
bootstrap();
```

**🎉 Done!** Access your API documentation at `http://localhost:3000/dynamic-api`

---

## Configuration Options

### Basic Configuration

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API Documentation',
  description: 'Complete API documentation for my application',
  version: '1.0.0',
  path: 'docs', // Custom documentation path
});
```

Access at: `http://localhost:3000/docs`

### Advanced Configuration

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  description: 'Detailed API documentation',
  version: '2.0.0',
  path: 'api-docs',
  swaggerExtraConfig: {
    contact: {
      name: 'API Support',
      url: 'https://myapi.com',
      email: 'support@myapi.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development',
      },
      {
        url: 'https://api.myapp.com',
        description: 'Production',
      },
    ],
    tags: [
      { name: 'users', description: 'User management endpoints' },
      { name: 'products', description: 'Product management endpoints' },
    ],
    bearerAuth: true, // Enable JWT Bearer authentication
  },
});
```

### Export Swagger JSON

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  version: '1.0.0',
  path: 'docs',
  jsonFilePath: './swagger.json', // Export OpenAPI spec to file
});
```

### SwaggerDocumentOptions

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  version: '1.0.0',
  swaggerDocumentOptions: {
    include: [UsersModule, ProductsModule], // Only include specific modules
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
  },
});
```

### All Available Options

```typescript
enableDynamicAPISwagger(app, {
  // Basic configuration
  title: 'My API',
  description: 'API description',
  version: '1.0.0',
  path: 'api-docs',
  jsonFilePath: './swagger.json',
  
  // Swagger extra configuration
  swaggerExtraConfig: {
    // Contact information
    contact: {
      name: 'API Support',
      url: 'https://api.example.com',
      email: 'support@example.com',
    },
    
    // License
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    
    // Terms of service
    termsOfService: 'https://example.com/terms',
    
    // Servers
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development',
        variables: {
          port: {
            default: '3000',
            description: 'Server port',
          },
        },
      },
    ],
    
    // External documentation
    externalDocs: {
      description: 'Find more info here',
      url: 'https://docs.example.com',
    },
    
    // Base path
    basePath: '/api',
    
    // Tags
    tags: [
      {
        name: 'users',
        description: 'User operations',
        externalDocs: {
          description: 'User guide',
          url: 'https://docs.example.com/users',
        },
      },
    ],
    
    // Extensions (OpenAPI extensions)
    extensions: {
      'x-custom-info': 'custom value',
      'x-api-id': '12345',
    },
    
    // Security schemes
    security: {
      'api-key': {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    
    // Global parameters
    globalParameters: [
      {
        name: 'X-Request-ID',
        in: 'header',
        required: false,
        schema: { type: 'string' },
      },
    ],
    
    // Security requirements
    securityRequirements: {
      'bearer-auth': [],
      'api-key': [],
    },
    
    // Authentication methods
    bearerAuth: true, // or { name: 'JWT-auth', options: {...} }
    oAuth2: false,
    apiKey: false,
    basicAuth: false,
    cookieAuth: false,
  },
  
  // Swagger document options
  swaggerDocumentOptions: {
    include: [UsersModule, ProductsModule],
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
    extraModels: [ExtraModel1, ExtraModel2],
  },
});
```

---

## Customization

### Add Documentation to Entities

Use `@ApiProperty` decorators for rich documentation:

```typescript
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty({ 
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ 
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @ApiPropertyOptional({ 
    description: 'Phone number with country code',
    example: '+1234567890',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @Prop({ type: String })
  phone?: string;

  @ApiProperty({ 
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  })
  @Prop({ type: String, enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;

  @ApiProperty({ 
    description: 'Account activation status',
    example: true,
    default: true,
  })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
```

### Add Route Descriptions

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    apiTag: 'Users', // Swagger tag name
  },
  routes: [
    {
      type: 'GetMany',
      description: 'Retrieve a paginated list of users',
      summary: 'Get all users',
    },
    {
      type: 'GetOne',
      description: 'Retrieve detailed information about a specific user',
      summary: 'Get user by ID',
    },
    {
      type: 'CreateOne',
      description: 'Create a new user account',
      summary: 'Create user',
    },
    {
      type: 'UpdateOne',
      description: 'Update an existing user information',
      summary: 'Update user',
    },
    {
      type: 'DeleteOne',
      description: 'Permanently delete a user account',
      summary: 'Delete user',
    },
  ],
})
```

### Authentication in Swagger

Enable JWT authentication testing:

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  description: 'API with JWT authentication',
  version: '1.0.0',
  swaggerExtraConfig: {
    bearerAuth: {
      name: 'JWT-auth',
      options: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
    },
  },
});
```

Or simply enable with defaults:

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  swaggerExtraConfig: {
    bearerAuth: true, // Use default Bearer auth configuration
  },
});
```

### Multiple Authentication Methods

```typescript
enableDynamicAPISwagger(app, {
  title: 'My API',
  swaggerExtraConfig: {
    bearerAuth: true,
    apiKey: {
      name: 'API-Key',
      options: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    basicAuth: true,
    cookieAuth: {
      cookieName: 'session',
      securityName: 'session-auth',
    },
  },
});
```

---

## Best Practices

### 1. Complete Entity Documentation

```typescript
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
    maximum: 1000000,
    type: 'number',
    format: 'double',
  })
  @Prop({ type: Number, required: true })
  price: number;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'High-performance laptop for professionals',
    maxLength: 2000,
  })
  @Prop({ type: String })
  description?: string;

  @ApiProperty({ 
    description: 'Product category',
    example: 'Electronics',
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
  })
  @Prop({ type: String, enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'] })
  category: string;

  @ApiPropertyOptional({ 
    description: 'Product images',
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @Prop({ type: [String] })
  images?: string[];
}
```

### 2. Use Meaningful Descriptions

```typescript
// ✅ Good - Clear and helpful
@ApiProperty({ 
  description: 'User email address. Must be unique across all users.',
  example: 'john.doe@example.com',
})

// ❌ Avoid - Too vague
@ApiProperty({ 
  description: 'Email',
  example: 'email@example.com',
})
```

### 3. Provide Realistic Examples

```typescript
// ✅ Good - Realistic examples
@ApiProperty({ 
  example: 'john.doe@example.com',
})
email: string;

@ApiProperty({ 
  example: '+1-555-0123',
})
phone: string;

@ApiProperty({ 
  example: 1299.99,
})
price: number;

// ❌ Avoid - Generic examples
@ApiProperty({ 
  example: 'string',
})
email: string;
```

### 4. Document Enums

```typescript
@ApiProperty({ 
  description: 'Order status',
  example: 'pending',
  enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
  enumName: 'OrderStatus',
})
@Prop({ 
  type: String, 
  enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
})
status: string;
```

### 5. Production Configuration

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Only enable Swagger in development
  if (process.env.NODE_ENV !== 'production') {
    enableDynamicAPISwagger(app, {
      title: 'Development API',
      description: 'API documentation for development',
      version: '1.0.0',
    });
    console.log('📚 Swagger: http://localhost:3000/dynamic-api');
  }

  await app.listen(3000);
}
bootstrap();
```

---

## Examples

### Complete Swagger Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPISwagger } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Configure Swagger with all options
  enableDynamicAPISwagger(app, {
    title: 'E-Commerce API',
    description: `
      Complete REST API for e-commerce platform
      
      ## Features
      - User management
      - Product catalog
      - Order processing
      - Authentication with JWT
      
      ## Authentication
      Most endpoints require authentication. Use the /auth/login endpoint to obtain a JWT token.
    `,
    version: '2.0.0',
    path: 'api-docs',
    jsonFilePath: './swagger.json', // Export OpenAPI spec
    swaggerExtraConfig: {
      contact: {
        name: 'API Support',
        url: 'https://myecommerce.com/support',
        email: 'support@myecommerce.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
        { url: 'https://staging-api.myecommerce.com', description: 'Staging' },
        { url: 'https://api.myecommerce.com', description: 'Production' },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'users', description: 'User management' },
        { name: 'products', description: 'Product catalog' },
        { name: 'orders', description: 'Order management' },
      ],
      bearerAuth: {
        name: 'JWT-auth',
        options: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      externalDocs: {
        description: 'API Documentation',
        url: 'https://docs.myecommerce.com',
      },
      termsOfService: 'https://myecommerce.com/terms',
    },
    swaggerDocumentOptions: {
      deepScanRoutes: true,
    },
  });

  await app.listen(3000);
  
  console.log('🚀 Application: http://localhost:3000');
  console.log('📚 API Documentation: http://localhost:3000/api-docs');
}
bootstrap();

// src/products/product.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
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

  @ApiPropertyOptional({ 
    description: 'Detailed product description',
    example: 'High-performance laptop with Intel Core i7, 16GB RAM, 512GB SSD',
    maxLength: 2000,
  })
  @Prop({ type: String })
  description?: string;

  @ApiProperty({ 
    description: 'Product price in USD',
    example: 1299.99,
    minimum: 0,
  })
  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @ApiProperty({ 
    description: 'Product category',
    example: 'Electronics',
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
  })
  @Prop({ type: String, required: true })
  category: string;

  @ApiProperty({ 
    description: 'Available stock quantity',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @Prop({ type: Number, default: 0, min: 0 })
  stock: number;

  @ApiPropertyOptional({ 
    description: 'Product image URLs',
    type: [String],
    example: ['https://cdn.example.com/products/laptop1.jpg'],
  })
  @Prop({ type: [String] })
  images?: string[];

  @ApiPropertyOptional({ 
    description: 'Product tags for search and categorization',
    type: [String],
    example: ['laptop', 'dell', 'xps', 'high-performance'],
  })
  @Prop({ type: [String] })
  tags?: string[];
}

// src/products/products.module.ts
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    apiTag: 'products',
  },
  routes: [
    {
      type: 'GetMany',
      description: 'Retrieve a paginated list of products with optional filtering',
      summary: 'List all products',
    },
    {
      type: 'GetOne',
      description: 'Get detailed information about a specific product',
      summary: 'Get product by ID',
    },
    {
      type: 'CreateOne',
      description: 'Create a new product in the catalog',
      summary: 'Create product',
    },
    {
      type: 'UpdateOne',
      description: 'Update product information',
      summary: 'Update product',
    },
    {
      type: 'DeleteOne',
      description: 'Remove a product from the catalog',
      summary: 'Delete product',
    },
  ],
})
```

---

## Swagger UI Features

### Interactive Testing

- **Try it out** - Test endpoints directly from the browser
- **Authorization** - Add JWT tokens for protected endpoints
- **Request/Response** - See examples and schemas
- **Models** - Browse all entity schemas

### URL Parameters

Add query parameters to customize the documentation:

```
http://localhost:3000/api-docs?url=/api-docs-json
```

---

## Related Documentation

- 🏗️ **[Entities](./entities.md)** - Entity documentation
- 🔐 **[Authentication](./authentication.md)** - Add auth to Swagger
- ✅ **[Validation](./validation.md)** - Validation in documentation

---

## Additional Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)





