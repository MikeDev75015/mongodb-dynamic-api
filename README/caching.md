[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Caching (enabled by default)

Caching is enabled globally for all routes using NestJS's in-memory store by default. You can customize or disable it easily.

## Quick Configuration Example

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb-uri', {
      cacheOptions: {
        ttl: 60, // Time to live in ms
        max: 100, // Max items in cache
      },
    }),
  ],
})
export class AppModule {}
```

- To disable global cache:

```typescript
DynamicApiModule.forRoot('mongodb-uri', { useGlobalCache: false });
```

## How It Works
- GET requests are cached until TTL expires, the cache is full, or a write (POST/PUT/PATCH/DELETE) occurs on the same route.
- The first GET returns `200`, subsequent GETs return `304 Not Modified` if the cache is valid, and a new `200` after a write.

## Example Workflow
1. `GET /users` → 200 (cache miss)
2. `GET /users` → 304 (cache hit)
3. `POST /users` → 200 (cache invalidated)
4. `GET /users` → 200 (cache refreshed)

## Best Practices
- Use cache for idempotent (GET) routes.
- Adjust `ttl` and `max` to fit your workload.
- For advanced usage, see the [NestJS Caching documentation](https://docs.nestjs.com/techniques/caching).

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
