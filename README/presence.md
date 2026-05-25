# Presence Management

`DynamicApiPresenceModule` tracks the **online/offline status** of authenticated WebSocket users in real time.  
It supports multi-tab connections (a user stays online until every socket disconnects) and an optional HTTP endpoint.

---

## Table of Contents

- [Quick start](#quick-start)
- [Module options](#module-options)
- [Adapters](#adapters)
  - [InMemoryPresenceAdapter](#inmemorypresenceadapter)
  - [RedisPresenceAdapter](#redispresenceadapter)
- [WebSocket events](#websocket-events)
- [HTTP endpoint (optional)](#http-endpoint-optional)
- [Dependency injection](#dependency-injection)
- [Architecture notes](#architecture-notes)

---

## Quick start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule, DynamicApiPresenceModule, enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost/mydb', {
      useAuth: {
        userEntity: UserEntity,
        jwt: { secret: 'my-secret', expiresIn: '1h' },
        login: {},
        webSocket: true,
      },
    }),

    // ← register presence alongside DynamicApiModule
    DynamicApiPresenceModule.register({
      adapter: 'memory',        // 'memory' | 'redis'
      enableController: true,   // expose GET /presence
    }),
  ],
})
export class AppModule {}
```

In your bootstrap function, call `enableDynamicAPIWebSockets` so the `SocketAdapter` decodes JWTs and populates `socket.user`:

```typescript
// main.ts
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIWebSockets(app);   // ← required for presence to work
  await app.listen(3000);
}
```

---

## Module options

```typescript
interface PresenceRegisterOptions {
  /**
   * Storage backend.
   * - `'memory'` — in-process Map. Single-instance / dev use.
   * - `'redis'`  — ioredis. Multi-instance / production.
   */
  adapter: 'memory' | 'redis';

  /**
   * Redis connection URL — required when `adapter === 'redis'`.
   * @example 'redis://localhost:6379'
   */
  redisUrl?: string;

  /**
   * TTL in seconds applied to every Redis key on write.
   * Acts as an automatic heartbeat safety-net (stale entries from crashed
   * processes expire). Refreshed on every `setOnline` call.
   * @default 60
   */
  redisTtlSeconds?: number;

  /**
   * Expose `GET /presence[?room=<roomId>]` HTTP endpoint.
   * @default false
   */
  enableController?: boolean;
}
```

### Example — Redis with custom TTL

```typescript
DynamicApiPresenceModule.register({
  adapter: 'redis',
  redisUrl: process.env.REDIS_URL,
  redisTtlSeconds: 90,
  enableController: true,
})
```

---

## Adapters

Both adapters implement the same `PresenceAdapter` interface:

```typescript
interface PresenceAdapter {
  /** Mark userId + socketId as online, optionally bound to a room. */
  setOnline(userId: string, socketId: string, room?: string): Promise<void>;

  /** Remove a socket from the user's online set. */
  setOffline(userId: string, socketId: string): Promise<void>;

  /** Returns true when the user has at least one active socket. */
  isOnline(userId: string): Promise<boolean>;

  /** Returns online user IDs, filtered by room when provided. */
  getOnlineUserIds(room?: string): Promise<string[]>;

  /** Returns the number of active sockets for the user (multi-tab). */
  getSocketCount(userId: string): Promise<number>;
}
```

### InMemoryPresenceAdapter

In-process. No external dependencies. Best for single-instance deployments and development.

- State is lost on process restart.
- Multi-tab: each `(userId, socketId)` pair is tracked independently.

### RedisPresenceAdapter

Redis-backed via [ioredis](https://github.com/redis/ioredis). Suitable for distributed / multi-instance deployments.

**Key schema:**

| Key | Type | Content |
|-----|------|---------|
| `presence:sockets:{userId}` | SET | Active socket IDs |
| `presence:room:{roomId}` | SET | User IDs in a room |

- Every key gets an `EXPIRE` (default: 60 s) refreshed on each `setOnline`.  
  This is a safety-net: if a process crashes, stale entries expire automatically.
- `setOffline` uses an atomic **Lua script** (SREM + DEL-if-empty) to avoid race conditions in multi-instance deployments.

---

## WebSocket events

The `PresenceGateway` shares the same socket.io namespace as the other DynamicApi gateways (no second server).

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `user:online` | Server → all clients | `{ userId: string }` | Emitted when an authenticated user connects. |
| `user:offline` | Server → all clients | `{ userId: string }` | Emitted when a user's **last** socket disconnects. |

### Client-side example

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: { accessToken: '<your-jwt>' },
});

socket.on('user:online',  ({ userId }) => console.log(`${userId} is online`));
socket.on('user:offline', ({ userId }) => console.log(`${userId} went offline`));
```

---

## HTTP endpoint (optional)

Enable with `enableController: true` in `register()`.

### `GET /presence`

Returns all online user IDs.

```json
{ "onlineUserIds": ["64a1...", "64b2..."] }
```

### `GET /presence?room=<roomId>`

Returns online user IDs in a specific room.

```json
{ "onlineUserIds": ["64a1..."] }
```

---

## Dependency injection

Inject the adapter anywhere in your application using the `DYNAMIC_API_PRESENCE_ADAPTER` token:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  DYNAMIC_API_PRESENCE_ADAPTER,
  PresenceAdapter,
} from 'mongodb-dynamic-api';

@Injectable()
export class ChatService {
  constructor(
    @Inject(DYNAMIC_API_PRESENCE_ADAPTER)
    private readonly presence: PresenceAdapter,
  ) {}

  async getOnlineFriends(roomId: string): Promise<string[]> {
    return this.presence.getOnlineUserIds(roomId);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.presence.isOnline(userId);
  }
}
```

---

## Architecture notes

1. **JWT decoding** is performed by `SocketAdapter` (wired by `enableDynamicAPIWebSockets`). It sets `socket.user` before any gateway listener fires.

2. **Connection tracking** is handled entirely by `PresenceGateway.afterInit(server)`:  
   - Registers a `connection` listener via `server.on('connection', ...)`.  
   - Each socket connect → `setOnline` → emit `user:online`.  
   - Each socket disconnect → `setOffline` → if `getSocketCount === 0` → emit `user:offline`.

3. **Same namespace** (Option B): `PresenceGateway` uses the same `@WebSocketGateway(options)` as the other DynamicApi gateways, so no second socket server is created.

4. **Multi-tab** support is built-in: a user is tracked per `(userId, socketId)` pair. `isOnline` / `user:offline` events only trigger when the last socket disconnects.

5. **Redis atomicity**: `setOffline` uses a Lua script to SREM + DEL-if-empty atomically, preventing race conditions between concurrent disconnects on different instances.

