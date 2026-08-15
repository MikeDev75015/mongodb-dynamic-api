[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Health Check

`DynamicApiHealthModule` exposes a ready-to-use `GET /health` readiness probe — the endpoint a Kubernetes readiness/liveness probe or a Heroku health check expects a "production-ready" API to have out of the box.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Response Shape](#response-shape)
- [Custom Path](#custom-path)
- [It's Public](#its-public)
- [Related Documentation](#related-documentation)

---

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule, DynamicApiHealthModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp'),
    DynamicApiHealthModule.register(),
  ],
})
export class AppModule {}
```

`GET /health` now reports the DynamicAPI MongoDB connection's live status.

---

## Response Shape

| MongoDB connection | HTTP status | Body |
|---|:---:|---|
| Connected | `200 OK` | `{ "status": "ok", "mongo": "up" }` |
| Not connected | `503 Service Unavailable` | `{ "status": "error", "mongo": "down" }` |

`503` is what orchestrators expect from a *readiness* probe when the app shouldn't receive traffic yet — a pod stuck reconnecting to MongoDB gets taken out of the load-balancer rotation instead of serving broken requests.

---

## Custom Path

```typescript
DynamicApiHealthModule.register({ path: 'healthz' })
```

Mounts the endpoint at `GET /healthz` instead of the default `GET /health`.

---

## It's Public

The route is decorated with `@Public()` internally, so it stays reachable even when `useAuth` is configured and the global `DynamicApiJwtAuthGuard` is active — an orchestrator polling this endpoint never carries a JWT.

---

## Related Documentation

- 🟢 **[Presence](./presence.md)** — another standalone module following the same `register()` pattern
- 🐞 **[Debugging](./debugging.md)** — `MONGODB_DYNAMIC_API_LOGGER` and where the library logs from

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)
