[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Caching

Smart caching is enabled by default for all **read** routes (GET / Aggregate), using NestJS's in-memory cache store. The module automatically manages cache invalidation to ensure data consistency.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Configuration Options](#configuration-options)
  - [Global Configuration](#global-configuration)
  - [Feature-Level Configuration](#feature-level-configuration)
  - [Route-Level Configuration](#route-level-configuration)
  - [Priority Resolution](#priority-resolution)
- [Cache Purge](#cache-purge)
  - [Auto-Purge on Write Operations](#auto-purge-on-write-operations)
  - [Manual Purge Endpoint](#manual-purge-endpoint)
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
- Auto-invalidation on write operations (POST, PUT, PATCH, DELETE)
- Cache applies only to read routes (GetMany, GetOne, Aggregate)

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

### What Is Cached?

Cache **only** applies to **read** operations:
- **GetMany** — `GET /{path}`
- **GetOne** — `GET /{path}/:id`
- **Aggregate** — `GET /{path}/aggregate` _(or custom sub-path)_

Write operations (POST, PUT, PATCH, DELETE) are **never cached**, but they **automatically purge** the cache after success.

### Cache Flow

1. **First GET Request** → 200 Response (Cache Miss)
   - Data is fetched from database
   - Response is stored in cache
   - Returns `200 OK`

2. **Subsequent GET Requests** → 304 Response (Cache Hit)
   - Data is retrieved from cache
   - Returns `304 Not Modified`
   - Much faster response time

3. **Write Operation** (POST/PUT/PATCH/DELETE) → Auto-Purge
   - Operation executes normally
   - **Cache is automatically purged** after success
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

# Write operation - cache auto-purged after success
POST /users → 201 Created  ← cache purged!

# Next request - cache refreshed
GET /users → 200 OK (100ms)

# Following request - cached again
GET /users → 304 Not Modified (5ms)
```

---

## Configuration Options

### Global Configuration

Configure caching at the root level:

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
| `useGlobalCache` | boolean | true | Enable/disable cache globally |
| `ttl` | number | 60000 | Time to live in milliseconds |
| `max` | number | 100 | Maximum number of items in cache |
| `store` | string\|Keyv\|Keyv[] | 'memory' | Cache storage manager (see [Different stores](https://docs.nestjs.com/techniques/caching#different-stores)) |
| `excludePaths` | string[] | [] | Paths to exclude from caching |
| `isCacheableValue` | function | - | Custom function to determine if a value should be cached |

### Feature-Level Configuration

Disable cache for an entire feature using `disableCache` in `controllerOptions`:

```typescript
// src/orders/orders.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Order,
      controllerOptions: {
        path: 'orders',
        disableCache: true, // ← Disable cache for ALL read routes of this feature
      },
    }),
  ],
})
export class OrdersModule {}
```

When `disableCache: true` is set at the feature level:
- All GetMany, GetOne, and Aggregate routes of this feature will **not be cached**
- Write operations will **not auto-purge** the cache (no need since nothing is cached)
- The **manual purge endpoint** will **not be generated** for this feature

### Route-Level Configuration

Disable cache for a specific route using `disableCache` in the route config:

```typescript
// src/products/products.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        // Cache is enabled at feature level (default)
      },
      routes: [
        {
          type: 'GetMany',
          disableCache: true, // ← Disable cache only for GetMany
        },
        {
          type: 'GetOne',
          // Cache remains enabled (default)
        },
        { type: 'CreateOne' },
        { type: 'UpdateOne' },
        { type: 'DeleteOne' },
      ],
    }),
  ],
})
export class ProductsModule {}
```

In this example:
- `GET /products` → **Not cached** (disableCache: true on GetMany)
- `GET /products/:id` → **Cached** (default)
- `POST /products` → Auto-purges cache after success
- `PATCH /products/:id` → Auto-purges cache after success
- `DELETE /products/:id` → Auto-purges cache after success

### Re-enable Cache at Route Level

You can also **re-enable** cache on a specific route when the feature disables it:

```typescript
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        disableCache: true, // ← Cache disabled for all routes
      },
      routes: [
        {
          type: 'GetMany',
          // Cache disabled (inherited from controller)
        },
        {
          type: 'GetOne',
          disableCache: false, // ← Re-enable cache for this route only
        },
        { type: 'CreateOne' },
      ],
    }),
  ],
})
export class ProductsModule {}
```

In this example:
- `GET /products` → **Not cached** (inherited from controller)
- `GET /products/:id` → **Cached** (route overrides controller)

### Priority Resolution

The `disableCache` option follows a **route > controller > global** priority:

| Route `disableCache` | Controller `disableCache` | Global `useGlobalCache` | Result |
|:-----:|:-----:|:-----:|--------|
| _not set_ | _not set_ | `true` (default) | ✅ Cache **enabled** |
| _not set_ | _not set_ | `false` | ❌ Cache **disabled** |
| _not set_ | `true` | `true` | ❌ Cache **disabled** |
| _not set_ | `false` | `true` | ✅ Cache **enabled** |
| `true` | _not set_ | `true` | ❌ Cache **disabled** |
| `true` | `false` | `true` | ❌ Cache **disabled** (route wins) |
| `false` | `true` | `true` | ✅ Cache **enabled** (route wins) |
| _any_ | _any_ | `false` | ❌ Cache **disabled** (global off = all off) |

> **Note:** `disableCache` only applies to **read** routes (GetMany, GetOne, Aggregate). Write operations never cache, they only auto-purge.

> **Note:** When `useGlobalCache: false`, cache is completely disabled regardless of any other setting.

---

## Cache Purge

### Auto-Purge on Write Operations

When cache is globally enabled, **every write operation** automatically purges the entire cache after success. This ensures that cached GET responses always reflect the latest data.

Affected operations:
- `POST` (CreateOne, CreateMany)
- `PUT` (ReplaceOne)
- `PATCH` (UpdateOne, UpdateMany)
- `DELETE` (DeleteOne, DeleteMany)
- `POST` (DuplicateOne, DuplicateMany)

```bash
# Cache is populated
GET /products       → 200 OK (cached)
GET /products/:id   → 200 OK (cached)

# A write operation purges all cache
PATCH /products/:id → 200 OK  ← entire cache purged!

# Next reads fetch fresh data
GET /products       → 200 OK (fresh from DB)
GET /products/:id   → 200 OK (fresh from DB)
```

### Manual Purge Endpoint

When cache is enabled for a feature, a **`DELETE /{path}/cache`** endpoint is **automatically generated**. This allows you to manually purge the cache at any time.

```bash
# Manually purge cache for products
DELETE /products/cache → { "purged": true }
```

**When is the endpoint generated?**

| `useGlobalCache` | Controller `disableCache` | Endpoint Generated? |
|:-:|:-:|:-:|
| `true` (default) | _not set_ or `false` | ✅ Yes |
| `true` | `true` | ❌ No |
| `false` | _any_ | ❌ No |

The endpoint:
- Appears in **Swagger UI** under the same tag as the feature
- Respects **authentication**: protected by JWT when auth is enabled, or public when the feature's `isPublic: true`
- Returns `{ "purged": true }` on success

#### Example: Swagger Integration

```typescript
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        apiTag: 'Products',
      },
    }),
  ],
})
export class ProductsModule {}
```

This will generate the following endpoint in Swagger:
- **`DELETE /products/cache`** — _Purge cache for Products_

#### Example: No Purge Endpoint

```typescript
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Order,
      controllerOptions: {
        path: 'orders',
        disableCache: true, // ← cache disabled → NO purge endpoint
      },
    }),
  ],
})
export class OrdersModule {}
```

---

## Cache Strategies

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

### Strategy 3: Selective Caching with disableCache

For applications requiring fine-grained control per feature/route:

```typescript
// Global: cache enabled with default TTL
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  cacheOptions: {
    ttl: 60000,
    max: 200,
  },
})

// Products: cache enabled (default) — rarely updated
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
})

// Orders: cache disabled — frequently changing, critical data
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
    disableCache: true,
  },
})

// Users: cache enabled, but not for GetMany
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: { path: 'users' },
  routes: [
    { type: 'GetMany', disableCache: true }, // User list changes frequently
    { type: 'GetOne' },                       // Individual user cached
    { type: 'UpdateOne' },
  ],
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
// Use disableCache at feature or route level
DynamicApiModule.forFeature({
  entity: LiveData,
  controllerOptions: {
    path: 'live-data',
    disableCache: true, // No cache for real-time features
  },
})
```

### 2. Use disableCache Instead of excludePaths

Prefer `disableCache` over `excludePaths` for feature-specific cache control:

```typescript
// ✅ Good - Fine-grained control per feature/route
DynamicApiModule.forFeature({
  entity: Order,
  controllerOptions: {
    path: 'orders',
    disableCache: true,
  },
})

// ✅ Also good - Disable cache only on specific routes
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: { path: 'users' },
  routes: [
    { type: 'GetMany', disableCache: true },
    { type: 'GetOne' },
  ],
})

// ⚠️ Use excludePaths for non-dynamic-api paths (health, metrics, etc.)
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    excludePaths: ['/health', '/metrics'],
  },
})

// ❌ Avoid - Using excludePaths for dynamic-api features
DynamicApiModule.forRoot(uri, {
  cacheOptions: {
    excludePaths: ['/orders', '/orders/*'], // Use disableCache instead
  },
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

### 6. Production Configuration

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

### Complete Application Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DynamicApiModule.forRoot(process.env.MONGODB_URI, {
      useGlobalCache: true,
      cacheOptions: {
        ttl: 60000,  // Default 1 minute
        max: 200,    // Default 200 items
        excludePaths: ['/health'],
      },
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
    StatsModule,
  ],
})
export class AppModule {}
```

### Feature with Default Cache (enabled)

```typescript
// src/products/products.module.ts
// Cache is enabled by default → all GET routes cached, auto-purge on write, purge endpoint available
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
        apiTag: 'Products',
      },
    }),
  ],
})
export class ProductsModule {}
// Generated endpoints:
// GET    /products         → cached ✅
// GET    /products/:id     → cached ✅
// POST   /products         → auto-purges cache
// PATCH  /products/:id     → auto-purges cache
// DELETE /products/:id     → auto-purges cache
// DELETE /products/cache   → manual purge endpoint ✅
```

### Feature with Cache Disabled

```typescript
// src/orders/orders.module.ts
// Cache completely disabled for this feature — no caching, no purge endpoint
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Order,
      controllerOptions: {
        path: 'orders',
        apiTag: 'Orders',
        disableCache: true, // ← disable cache for all routes of this feature
      },
    }),
  ],
})
export class OrdersModule {}
// Generated endpoints:
// GET    /orders           → NOT cached ❌
// GET    /orders/:id       → NOT cached ❌
// POST   /orders           → no purge (nothing to purge)
// PATCH  /orders/:id       → no purge
// DELETE /orders/:id       → no purge
// DELETE /orders/cache     → NOT generated ❌
```

### Feature with Mixed Route-Level Control

```typescript
// src/users/users.module.ts
// Cache enabled at feature level, but disabled for specific routes
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        apiTag: 'Users',
      },
      routes: [
        {
          type: 'GetMany',
          disableCache: true, // ← user list changes frequently, disable cache
        },
        {
          type: 'GetOne',
          // cache enabled (default) — individual user profile is stable
        },
        { type: 'CreateOne' },
        { type: 'UpdateOne' },
        { type: 'DeleteOne' },
      ],
    }),
  ],
})
export class UsersModule {}
// Generated endpoints:
// GET    /users            → NOT cached ❌ (disableCache: true)
// GET    /users/:id        → cached ✅
// POST   /users            → auto-purges cache
// PATCH  /users/:id        → auto-purges cache
// DELETE /users/:id        → auto-purges cache
// DELETE /users/cache      → manual purge endpoint ✅ (feature cache is enabled)
```

### Feature with Cache Disabled at Controller but Re-enabled on One Route

```typescript
// src/stats/stats.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Stat,
      controllerOptions: {
        path: 'stats',
        apiTag: 'Stats',
        disableCache: true, // ← disable cache for all routes
      },
      routes: [
        {
          type: 'GetMany',
          // cache disabled (inherited from controller)
        },
        {
          type: 'Aggregate',
          disableCache: false, // ← re-enable cache for this expensive aggregation
        },
      ],
    }),
  ],
})
export class StatsModule {}
// Generated endpoints:
// GET    /stats            → NOT cached ❌ (inherited from controller)
// GET    /stats/aggregate  → cached ✅ (route overrides controller)
// DELETE /stats/cache      → NOT generated ❌ (controller disableCache: true)
```

> **Note:** The manual purge endpoint is generated based on the **controller-level** `disableCache` value.
> If `disableCache: true` at controller level, no purge endpoint is generated — even if some routes re-enable cache.
> This is by design: if most routes are uncached, you probably don't need a manual purge endpoint.

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
| Aggregate | 300-1000ms | 5-10ms | 60x faster |
| High Load | Varies | Consistent | Stable |

### Cache Hit Rate Targets

- **Excellent**: > 80% cache hit rate
- **Good**: 60-80% cache hit rate
- **Poor**: < 60% cache hit rate

If your hit rate is low:
- Increase TTL duration
- Review cache size limits
- Check if data changes too frequently
- Use `disableCache` on volatile routes instead of globally disabling cache

---

## API Reference

### Interfaces

#### `DynamicApiControllerOptions`

```typescript
interface DynamicApiControllerOptions<Entity> {
  path: string;
  apiTag?: string;
  version?: string;
  isPublic?: boolean;
  disableCache?: boolean; // ← Disable cache for all read routes of this feature
  // ...other options
}
```

#### `DynamicApiRouteConfig`

```typescript
interface DynamicApiRouteConfig<Entity> {
  type: RouteType;
  isPublic?: boolean;
  disableCache?: boolean; // ← Disable cache for this specific route
  // ...other options
}
```

### Cache Purge Endpoint

| Method | Path | Response | Description |
|--------|------|----------|-------------|
| `DELETE` | `/{path}/cache` | `{ "purged": true }` | Purges all cached entries |

> Only generated when `useGlobalCache: true` **and** controller `disableCache` is not `true`.

---

## Related Documentation

- ✅ **[Validation](./validation.md)** - Validate request data
- 🔐 **[Authentication](./authentication.md)** - Setup JWT authentication
- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation
- ⚙️ **[Controller Config](./controller-config.md)** - Controller options
- 🛣️ **[Route Config](./route-config.md)** - Route options

---

## Additional Resources

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Cache-Manager Documentation](https://github.com/node-cache-manager/node-cache-manager)
- [Redis Best Practices](https://redis.io/topics/lru-cache)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

