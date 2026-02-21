[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Caching

Smart caching is enabled by default for all routes, using NestJS's in-memory cache store. The module automatically manages cache invalidation to ensure data consistency.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Configuration Options](#configuration-options)
- [Cache Strategies](#cache-strategies)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Default Configuration

Caching is enabled globally by default with sensible defaults:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp'),
    // Caching is automatically enabled with default settings
  ],
})
export class AppModule {}
```

**Default Settings:**
- TTL (Time to Live): 60000ms (1 minute)
- Max Items: 100
- Auto-invalidation on write operations

### Custom Configuration

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 300000, // 5 minutes in milliseconds
    max: 200,    // Maximum 200 items in cache
  },
})
```

### Disable Global Cache

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  useGlobalCache: false, // Disable caching globally
})
```

---

## How It Works

The caching system operates with the following logic:

### Cache Flow

1. **First GET Request** → 200 Response (Cache Miss)
   - Data is fetched from database
   - Response is stored in cache
   - Returns `200 OK`

2. **Subsequent GET Requests** → 304 Response (Cache Hit)
   - Data is retrieved from cache
   - Returns `304 Not Modified`
   - Much faster response time

3. **Write Operation** (POST/PUT/PATCH/DELETE)
   - Cache is automatically invalidated
   - Ensures data consistency

4. **Next GET Request** → 200 Response (Cache Refreshed)
   - Data is fetched from database again
   - Cache is repopulated

### Example Workflow

```bash
# Initial request - cache miss
GET /users → 200 OK (100ms)

# Second request - cache hit
GET /users → 304 Not Modified (5ms)

# Third request - still cached
GET /users → 304 Not Modified (5ms)

# Write operation - cache invalidated
POST /users → 201 Created

# Next request - cache refreshed
GET /users → 200 OK (100ms)

# Following request - cached again
GET /users → 304 Not Modified (5ms)
```

---

## Configuration Options

### Global Configuration

Configure caching at the root level (this is the ONLY level where cache can be configured):

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  useGlobalCache: true, // Enable/disable global cache (default: true)
  cacheOptions: {
    ttl: 60000,           // Time to live in milliseconds (default: 60000)
    max: 100,             // Maximum number of items in cache (default: 100)
    store: 'memory',      // Cache store (default: 'memory')
    excludePaths: ['/health', '/metrics'], // Paths to exclude from caching
    isCacheableValue: (value) => value !== null, // Custom cache validation
  },
})
```

**Available Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | number | 60000 | Time to live in milliseconds |
| `max` | number | 100 | Maximum number of items in cache |
| `store` | string\|Keyv\|Keyv[] | 'memory' | Cache storage manager (see [Different stores](https://docs.nestjs.com/techniques/caching#different-stores)) |
| `excludePaths` | string[] | [] | Paths to exclude from caching |
| `isCacheableValue` | function | - | Custom function to determine if a value should be cached |

### Disable Global Cache

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  useGlobalCache: false, // Disable caching globally
})
```

### Exclude Specific Paths

Useful for health checks, metrics, or real-time endpoints:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    excludePaths: [
      '/health',
      '/metrics', 
      '/live-data',
      '/auth/login',
    ],
  },
})
```

**Note:** Cache configuration is ONLY available at the global level (`forRoot`). There is no controller-level or route-level cache configuration.

---

## Cache Strategies

Since cache is configured globally, you need to plan your strategy based on your application's overall needs.

### Strategy 1: Balanced Caching (Recommended)

Use moderate TTL for most applications:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 60000,  // 1 minute - good balance
    max: 100,
    excludePaths: ['/auth/login', '/auth/register'], // Exclude auth endpoints
  },
})
```

**Use Case:** General purpose applications with mixed content types

### Strategy 2: High-Performance Caching

For read-heavy applications with less frequent updates:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 300000, // 5 minutes
    max: 500,
    excludePaths: ['/health', '/metrics'],
  },
})
```

**Use Case:** Content sites, catalogs, documentation, blogs

### Strategy 3: Selective Caching

For applications requiring real-time data on some endpoints:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 60000, // 1 minute default
    max: 200,
    excludePaths: [
      '/live-data',      // Real-time endpoints
      '/stock-prices',   // Frequently changing data
      '/notifications',  // User-specific data
      '/transactions',   // Critical financial data
      '/auth/*',         // All auth endpoints
    ],
  },
})
```

**Use Case:** Mixed applications with real-time and static content

### Strategy 4: No Caching (Development/Testing)

Disable caching for development or when debugging:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  useGlobalCache: false, // Completely disable cache
})
```

**Use Case:** Development, testing, debugging

---

## Best Practices

### 1. Cache Duration Guidelines

Choose TTL based on your data characteristics:

```typescript
// Very Static Content (hours to days)
// Examples: site configuration, categories, countries list
DynamicApiModule.forRoot(uri, {
  cacheOptions: { ttl: 3600000 }, // 1 hour
})

// Static Content (minutes to hours)
// Examples: product catalog, blog posts, user profiles
DynamicApiModule.forRoot(uri, {
  cacheOptions: { ttl: 600000 }, // 10 minutes
})

// Dynamic Content (seconds to minutes) - RECOMMENDED DEFAULT
// Examples: search results, comments, notifications
DynamicApiModule.forRoot(uri, {
  cacheOptions: { ttl: 60000 }, // 1 minute
})

// Real-Time Content (very short or no cache)
// Examples: live data, stock prices, chat messages
// Use excludePaths to exclude specific endpoints
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    ttl: 60000,
    excludePaths: ['/live-data', '/stock-prices'],
  },
})

// Critical Operations (no cache)
// Examples: transactions, payments, authentication
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    excludePaths: ['/transactions', '/payments', '/auth/*'],
  },
})
```

### 2. Use excludePaths for Real-Time Endpoints

Instead of disabling cache globally, exclude specific paths:

```typescript
// ✅ Good - Cache most endpoints, exclude real-time ones
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    ttl: 60000,
    excludePaths: ['/live-feed', '/notifications', '/chat'],
  },
})

// ❌ Avoid - Disabling cache completely
DynamicApiModule.forRoot(uri, {
  useGlobalCache: false,
})
```

### 3. Configure Max Items Based on Memory

```typescript
// Small application
cacheOptions: { max: 50 }

// Medium application (default)
cacheOptions: { max: 100 }

// Large application
cacheOptions: { max: 500 }

// High-traffic application
cacheOptions: { max: 1000 }
```

### 4. Use Redis for Production with Multiple Instances

```typescript
import { redisStore } from 'cache-manager-redis-store';

DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    store: redisStore,
    host: 'localhost',
    port: 6379,
    ttl: 60000,
  },
})
```

### 5. Custom Cache Validation

```typescript
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    ttl: 60000,
    isCacheableValue: (value) => {
      // Don't cache empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      // Don't cache null/undefined
      return value !== null && value !== undefined;
    },
  },
})
```

### 4. Consider Cache Size

```typescript
// Balance between memory usage and performance
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 300000,
    max: 1000, // Adjust based on available memory
  },
})

// Calculate approximate memory usage:
// max * average_response_size = total_cache_memory
// Example: 1000 items * 10KB = 10MB
```

### 5. Production Configuration

```typescript
// .env
CACHE_TTL=300000
CACHE_MAX_ITEMS=500

// src/config/cache.config.ts
export const cacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL, 10) || 60000,
  max: parseInt(process.env.CACHE_MAX_ITEMS, 10) || 100,
};

// src/app.module.ts
import { cacheConfig } from './config/cache.config';

DynamicApiModule.forRoot(process.env.MONGODB_URI, {
  cacheOptions: cacheConfig,
})
```

---

## Examples

### Complete Caching Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DynamicApiModule.forRoot(process.env.MONGODB_URI, {
      useGlobalCache: true,
      cacheOptions: {
        ttl: 60000,  // Default 1 minute
        max: 200,    // Default 200 items
      },
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}

// src/products/products.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        cacheOptions: {
          ttl: 300000, // 5 minutes - products don't change often
          max: 100,
        },
      },
    }),
  ],
})
export class ProductsModule {}

// src/users/users.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        cacheOptions: {
          ttl: 120000, // 2 minutes - user data is dynamic
          max: 50,
        },
      },
    }),
  ],
})
export class UsersModule {}

// src/orders/orders.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Order,
      controllerOptions: {
        path: 'orders',
      },
      routes: [
        {
          type: 'GetMany',
          cacheOptions: { ttl: 0 }, // No cache for orders list
        },
        {
          type: 'GetOne',
          cacheOptions: { ttl: 30000 }, // 30 seconds for individual order
        },
      ],
    }),
  ],
})
export class OrdersModule {}
```

### Redis Cache Integration

For production environments with multiple instances, use Redis as cache store.

**Note:** The library includes all necessary cache dependencies. Redis integration works out of the box.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    DynamicApiModule.forRoot(process.env.MONGODB_URI, {
      useGlobalCache: true,
      cacheOptions: {
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        ttl: 60000,
        max: 1000,
      },
    }),
  ],
})
export class AppModule {}
```

**With Redis password:**

```typescript
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    store: redisStore,
    host: 'redis.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: 60000,
  },
})
```

---

## Performance Metrics

### Expected Performance Improvements

| Scenario | Without Cache | With Cache | Improvement |
|----------|--------------|------------|-------------|
| Simple GET | 50-100ms | 5-10ms | 10x faster |
| Complex Query | 200-500ms | 5-10ms | 40x faster |
| High Load | Varies | Consistent | Stable |

### Cache Hit Rate Targets

- **Excellent**: > 80% cache hit rate
- **Good**: 60-80% cache hit rate
- **Poor**: < 60% cache hit rate

If your hit rate is low:
- Increase TTL duration
- Review cache size limits
- Check if data changes too frequently

---

## Related Documentation

- ✅ **[Validation](./validation.md)** - Validate request data
- 🔐 **[Authentication](./authentication.md)** - Setup JWT authentication
- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation

---

## Additional Resources

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Cache-Manager Documentation](https://github.com/node-cache-manager/node-cache-manager)
- [Redis Best Practices](https://redis.io/topics/lru-cache)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)







