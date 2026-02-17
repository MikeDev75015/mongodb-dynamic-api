[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# WebSockets

Add WebSocket support to your API easily.

## Quick Setup

```typescript
// src/main.ts
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIWebSockets(app); // Enable WebSockets
  await app.listen(3000);
}
```

- You can set the max number of listeners (default: 10).
- See [NestJS WebSockets docs](https://docs.nestjs.com/websockets/gateways#installation) for more.

## Usage

Enable WebSockets globally, per module, or per route:

```typescript
// Global
DynamicApiModule.forRoot({ webSocket: true });

// Per module/feature
DynamicApiModule.forFeature({ webSocket: true });

// Per route
DynamicApiModule.forFeature({
  routes: [
    { type: 'CreateOne', webSocket: true },
  ],
});
```

- Global applies to all modules/routes, module applies to all routes in the module, route applies only to that route.

````

