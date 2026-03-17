[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# WebSockets

Add WebSocket support to your API to make your routes accessible via Socket.IO in addition to HTTP REST. This allows clients to call API endpoints through WebSocket connections.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Levels](#configuration-levels)
  - [Global Configuration](#global-configuration)
  - [Module-Level Configuration](#module-level-configuration)
  - [Route-Level Configuration](#route-level-configuration)
  - [Custom Event Names](#custom-event-names)
  - [Broadcasting Events](#broadcasting-events)
    - [Broadcasting for CRUD Routes](#broadcasting-for-crud-routes)
    - [Broadcasting for Auth Routes](#broadcasting-for-auth-routes)
    - [Room-Targeted Broadcasting](#room-targeted-broadcasting)
- [Available Events](#available-events)
  - [Authentication Events](#authentication-events-1)
- [Authentication with WebSockets](#authentication-with-websockets)
- [Server-Side Room Assignment (onConnection)](#server-side-room-assignment-onconnection)
- [Debug Mode](#debug-mode)
- [Client Integration](#client-integration)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Enable WebSockets

Add WebSocket support in your `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable WebSocket support (recommended form — options object)
  // ⚠️ Also required if you use broadcast-only (no webSocket: true on routes)
  enableDynamicAPIWebSockets(app, { debug: true });
  
  await app.listen(3000);
  console.log('🚀 HTTP Server: http://localhost:3000');
  console.log('🔌 WebSocket Server: ws://localhost:3000');
}
bootstrap();
```

> **Note:** `enableDynamicAPIWebSockets(app)` is required whenever you use **any** WebSocket feature — including broadcasting after HTTP calls — even if no route has `webSocket: true`.

> **⚠️ Deprecated:** The numeric overload `enableDynamicAPIWebSockets(app, 50)` is deprecated and will be removed in v5. Use the options-object form instead:
> ```typescript
> // ❌ Deprecated
> enableDynamicAPIWebSockets(app, 50);
>
> // ✅ Recommended
> enableDynamicAPIWebSockets(app, { maxListeners: 50 });
> ```

### Enable WebSockets Globally

```typescript
// src/app.module.ts
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  webSocket: true, // Enable WebSockets for all modules
})
```

**🎉 Done!** Your API routes are now accessible via WebSocket in addition to HTTP.

---

## Configuration Levels

### Global Configuration

Enable WebSockets for all modules:

```typescript
// Simple boolean configuration
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  webSocket: true, // Enable WebSockets globally
})

// Or with Socket.IO Gateway options
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  webSocket: {
    namespace: '/api', // Socket.IO namespace
    cors: {
      origin: '*',
      credentials: true,
    },
  },
})
```

### Module-Level Configuration

Enable for specific modules:

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
  },
  webSocket: true, // Enable WebSockets for this module
})
```

### Route-Level Configuration

Enable specific routes to be accessible via WebSocket:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
  },
  routes: [
    {
      type: 'CreateOne',
      webSocket: true, // This route can be called via WebSocket
    },
    {
      type: 'UpdateOne',
      webSocket: true, // This route can be called via WebSocket
    },
    {
      type: 'DeleteOne',
      webSocket: true, // This route can be called via WebSocket
    },
  ],
})
```

### Custom Event Names

By default, events follow the pattern `{route-type}-{displayed-name}` in kebab-case (e.g., `create-one-products`, `get-many-users`). The `displayed-name` is determined by `apiTag` if provided, otherwise falls back to the entity class name. You can customize the event name using the `eventName` parameter:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
    apiTag: 'Items', // If provided, events will be: create-one-items, get-many-items, etc.
  },
  routes: [
    {
      type: 'CreateOne',
      webSocket: true,
      eventName: 'new-product', // Custom event name instead of 'create-one-items'
    },
    {
      type: 'GetMany',
      webSocket: true,
      eventName: 'list-products', // Custom event name instead of 'get-many-items'
    },
  ],
})

// Client usage with custom event names
socket.emit('new-product', { name: 'Laptop', price: 999 }, (response) => {
  console.log('Created:', response.data);
});

socket.emit('list-products', { page: 1, limit: 10 }, (response) => {
  console.log('Products:', response.data);
});
```

**When to use custom event names:**
- Creating a more intuitive API for clients
- Following a specific naming convention
- Avoiding naming conflicts
- Simplifying event names for easier maintenance

### Broadcasting Events

You can automatically broadcast event responses to all connected clients (except the sender) using the `broadcast` option. This is useful for real-time synchronization across multiple clients.

#### Broadcasting for CRUD Routes

> **🔑 Key concept: `broadcast` is fully independent from `webSocket: true`.**
>
> You can broadcast after **HTTP REST calls** without enabling WebSocket on the route at all. The only requirement is that `enableDynamicAPIWebSockets(app)` is called in `main.ts` so the WebSocket server is available to receive listeners. `webSocket: true` on a route only controls whether that route is also *callable* via WebSocket — it has no effect on broadcasting.

**⚠️ Important: Broadcasting is only available for routes that modify data.**

**Supported Routes:**
- ✅ `CreateOne` - Broadcasts the created entity
- ✅ `CreateMany` - Broadcasts the list of created entities
- ✅ `UpdateOne` - Broadcasts the updated entity
- ✅ `UpdateMany` - Broadcasts the list of updated entities
- ✅ `ReplaceOne` - Broadcasts the replaced entity
- ✅ `DuplicateOne` - Broadcasts the duplicated entity
- ✅ `DuplicateMany` - Broadcasts the list of duplicated entities
- ✅ `DeleteOne` - Broadcasts a minimal object with the deleted entity's `id`
- ✅ `DeleteMany` - Broadcasts a list of minimal objects with the deleted entities' `ids`

**Not Supported (Read-only routes):**
- ❌ `GetOne` - No broadcast (read operation)
- ❌ `GetMany` - No broadcast (read operation)
- ❌ `Aggregate` - No broadcast (read operation)

**Prerequisites:**

```typescript
// src/main.ts — Required for any broadcast to work
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIWebSockets(app); // Initializes the WS server for broadcasts
  await app.listen(3000);
}
```

**Example: broadcast on HTTP-only routes (no `webSocket: true` required)**

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'CreateOne',
      // ✅ No webSocket: true — this route is HTTP only
      // but it still broadcasts to all WS clients after POST /products
      broadcast: {
        enabled: true,
        // eventName defaults to the WS event name pattern: 'create-one-product'
      },
    },
    {
      type: 'UpdateOne',
      broadcast: {
        enabled: true,
        eventName: 'product-updated', // Custom broadcast event name
      },
    },
    {
      type: 'DeleteOne',
      broadcast: {
        enabled: (data, user) => user?.role === 'admin', // Conditional broadcast
      },
    },
  ],
})
```

**Example: broadcast combined with WebSocket (route callable via both HTTP and WS)**

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'CreateOne',
      webSocket: true, // Route also callable via WS event 'create-one-product'
      broadcast: {
        enabled: true, // Broadcasts after both HTTP POST and WS emit
      },
    },
    {
      type: 'UpdateMany',
      webSocket: true,
      broadcast: {
        // enabled is called ONCE PER UPDATED ENTITY
        // Only entities where status === 'published' are broadcasted
        enabled: (data, user) => data.status === 'published',
        eventName: 'products-published',
      },
    },
  ],
})
```

**Broadcast Configuration Options:**

The `broadcast` option accepts an object with the following properties:

- `enabled` (required): Can be:
  - `true` - Always broadcasts to all clients
  - `false` - Never broadcasts (same as omitting the option)
  - `BroadcastAbilityPredicate<ResponseData>` - Function with signature `(data: ResponseData, user: User) => boolean` that determines whether to broadcast a specific entity. **This predicate is evaluated per entity**: for routes that return multiple entities (e.g., `CreateMany`, `UpdateMany`, `DuplicateMany`, `DeleteMany`), the function is called once for each entity in the response, and only entities that pass the test are broadcasted.

- `eventName` (optional): Custom event name for the broadcast. If not specified, uses the same event name pattern as the route (`{route-type}-{displayed-name}`).

- `rooms` (optional): Target specific Socket.IO rooms instead of broadcasting to all connected clients. Can be:
  - `string` — a single static room name (e.g., `'admin-room'`)
  - `string[]` — multiple static room names (e.g., `['room-a', 'room-b']`)
  - `(data: ResponseData) => string | string[]` — a function called **per entity** that dynamically resolves room(s) from the entity data. All resolved rooms are deduplicated.

  When `rooms` is set, only clients that have **joined** those rooms (via the `join-rooms` event) will receive the broadcast. When `rooms` is not set, all connected clients receive the broadcast (default behavior).

  See [Room-Targeted Broadcasting](#room-targeted-broadcasting) for full details and examples.

**Special Note for Delete Routes:**

For `DeleteOne` and `DeleteMany` routes, the broadcasted data contains only the `id` of the deleted entity/entities, not the full entity data (since the entity has been deleted). The `BroadcastAbilityPredicate` receives a minimal object: `{ id: string }`.

**Important**: Even for `DeleteMany`, the predicate is called **once per deleted entity** with a single `{ id: string }` object, not with an array.

```typescript
// DeleteOne example
{
  type: 'DeleteOne',
  webSocket: true,
  broadcast: {
    // data parameter is a single object: { id: string }
    // user parameter allows permission checks
    enabled: (data, user) => user?.role === 'admin',
    eventName: 'product-deleted',
  },
}

// DeleteMany example
{
  type: 'DeleteMany',
  webSocket: true,
  broadcast: {
    // enabled is called ONCE PER ENTITY with { id: string }
    // Only entities that pass the test are broadcasted
    enabled: (data, user) => {
      // data is { id: string }, NOT an array
      // This will be called for each deleted item
      return user?.role === 'moderator' || user?.role === 'admin';
    },
    eventName: 'products-deleted',
  },
}
```

**Client Example with Broadcasting:**

```typescript
// Client 1: Creates a product
socket.emit('create-one-product', { name: 'Laptop', price: 999 }, (response) => {
  console.log('Client 1 - Created:', response.data);
});

// Client 2: Listens for broadcasts (same event name)
socket.on('create-one-product', (data) => {
  console.log('Client 2 - New product created:', data);
  // data contains the full product object
  // Update UI with the new product
});

// Client 3: Listens for custom broadcast events
socket.on('product-updated', (data) => {
  console.log('Client 3 - Product updated:', data);
  // data contains the full updated product object
  // Update UI with the modified product
});

// All clients: Listen for conditional broadcasts
socket.on('products-published', (data) => {
  console.log('Published products received:', data);
  // data is an array containing only the products that passed the enabled check
  // (i.e., products where status === 'published')
  // Update UI with newly published products
});

// Client 4: Listens for delete broadcasts
socket.on('product-deleted', (data) => {
  console.log('Product deleted:', data);
  // For delete routes, data contains only: [{ id: '...' }]
  // Use the id to remove the item from your UI
  const deletedIds = data.map(item => item.id);
  // Remove from local state
});

// Client 5: Listens for CreateMany broadcasts with filtering
socket.on('expensive-products-created', (data) => {
  console.log('Expensive products created:', data);
  // data is an array containing only products where price > 100
  // Each product in the array passed the enabled check
  // Update UI with the new expensive products
  data.forEach(product => {
    console.log(`New expensive product: ${product.name} - $${product.price}`);
  });
});

// Example: Multiple clients handling product deletion
// Client 1: Deletes a product
socket.emit('delete-one-product', { id: '507f1f77bcf86cd799439011' }, (response) => {
  console.log('Client 1 - Deleted:', response.data);
  // Response contains delete result
});

// Client 2: Receives the broadcast (if enabled)
socket.on('product-deleted', (data) => {
  console.log('Client 2 - Product deleted by another user:', data);
  // data = [{ id: '507f1f77bcf86cd799439011' }]
  // Remove the product from the UI
  removeProductFromUI(data[0].id);
});

// Example: CreateMany with filtering
// Client 1: Creates multiple products
socket.emit('create-many-product', {
  list: [
    { name: 'Cheap Item', price: 10 },
    { name: 'Expensive Item', price: 500 },
    { name: 'Medium Item', price: 50 },
    { name: 'Luxury Item', price: 1000 },
  ]
}, (response) => {
  console.log('Client 1 - Created products:', response.data);
  // Response contains all 4 created products
});

// Client 2: Receives only filtered products via broadcast
socket.on('expensive-products-created', (data) => {
  console.log('Client 2 - Expensive products created:', data);
  // data = [
  //   { name: 'Expensive Item', price: 500, ... },
  //   { name: 'Luxury Item', price: 1000, ... }
  // ]
  // Only products with price > 100 are received
  // Cheap Item (10) and Medium Item (50) are NOT in this broadcast
});
```

**When to use broadcasting:**
- Real-time collaboration features
- Live dashboards that need to stay synchronized
- Chat applications
- Notification systems
- Multi-user editing interfaces
- **Push updates to WS clients after HTTP REST calls** — broadcast works on HTTP-only routes without enabling `webSocket: true`

**When to use conditional broadcasting (BroadcastAbilityPredicate):**
- Only broadcast changes made by specific user roles (e.g., only admin actions)
- Broadcast only when certain conditions are met (e.g., entity status changes)
- Implement privacy controls (e.g., only broadcast public items)
- Optimize performance by avoiding unnecessary broadcasts

#### Broadcasting for Auth Routes

Authentication actions also support broadcasting. Like CRUD routes, **auth broadcasting is fully independent from WebSocket** — it works after both HTTP REST calls and WebSocket calls, without requiring `useAuth.webSocket` to be enabled:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  broadcastGatewayOptions: {   // Optional — configure the broadcast WebSocket gateway
    namespace: '/events',
    cors: { origin: '*' },
  },
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['role', 'name'],
      broadcast: {
        enabled: true,
        fields: ['id', 'email', 'name', 'role'], // Only broadcast these fields
        // eventName: 'auth-login-broadcast' (default)
      },
    },
    register: {
      broadcast: {
        enabled: true,
        // Data comes from JWT payload (id + loginField + login.additionalFields)
        fields: ['id', 'email', 'name'],
      },
    },
    getAccount: {
      broadcast: {
        enabled: (data) => data.role === 'admin', // Only for admins
        eventName: 'admin-activity',
        fields: ['id', 'email'],
      },
    },
    updateAccount: {
      broadcast: {
        enabled: true,
        fields: ['id', 'email', 'name', 'role'],
        // eventName: 'auth-update-account-broadcast' (default)
      },
    },
  },
})
```

**Supported auth actions:**
- ✅ `login` → broadcasts `auth-login-broadcast` (or custom `eventName`)
- ✅ `register` → broadcasts `auth-register-broadcast` (or custom `eventName`)
- ✅ `getAccount` → broadcasts `auth-get-account-broadcast` (or custom `eventName`)
- ✅ `updateAccount` → broadcasts `auth-update-account-broadcast` (or custom `eventName`)
- ❌ `resetPassword` / `changePassword` — not supported

> See the [Broadcasting Auth Events](./authentication.md#broadcasting-auth-events) section in the Authentication documentation for full details, including how to filter fields and the data source for each action.

### Room-Targeted Broadcasting

By default, broadcasts are sent to **all** connected WebSocket clients. With the `rooms` option, you can restrict broadcasts to only the clients that have joined specific [Socket.IO rooms](https://socket.io/docs/v4/rooms/). This is useful when different groups of clients care about different subsets of data (e.g., per-tenant, per-category, per-project).

#### How Rooms Work

1. **Clients join rooms** by emitting `join-rooms` (requires authentication).
2. **Server broadcasts to rooms** — when `rooms` is configured on a route's `broadcast`, only sockets in the resolved rooms receive the event.
3. **Clients leave rooms** by emitting `leave-rooms` (requires authentication).

If `rooms` is **not set**, the broadcast falls back to the default behavior (all connected clients).

#### Joining and Leaving Rooms

The broadcast gateway exposes two events for room management. **Both require authentication** (JWT token):

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `join-rooms` | `{ rooms: string \| string[] }` | `string[]` — list of joined rooms | Adds the socket to one or more rooms |
| `leave-rooms` | `{ rooms: string \| string[] }` | `string[]` — list of left rooms | Removes the socket from one or more rooms |

**Client example — joining and leaving rooms:**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'my-jwt-access-token' },
});

// Join a single room
socket.emit('join-rooms', { rooms: 'electronics' }, (response) => {
  console.log('Joined rooms:', response);
  // response.data = ['electronics']
});

// Join multiple rooms at once
socket.emit('join-rooms', { rooms: ['electronics', 'gadgets'] }, (response) => {
  console.log('Joined rooms:', response);
  // response.data = ['electronics', 'gadgets']
});

// Leave a room
socket.emit('leave-rooms', { rooms: 'electronics' }, (response) => {
  console.log('Left rooms:', response);
  // response.data = ['electronics']
});

// ⚠️ Without a valid JWT token, an 'Unauthorized' exception is thrown
socket.emit('join-rooms', { rooms: 'some-room' });
// → exception event: { message: 'Unauthorized' }
```

#### `BroadcastRooms` Type

```typescript
type BroadcastRooms<T extends object> = string | string[] | ((data: T) => string | string[]);
```

| Form | Description | Example |
|------|-------------|---------|
| `string` | A single static room name — all broadcasts go to this room | `'admin-room'` |
| `string[]` | Multiple static room names | `['room-a', 'room-b']` |
| `(data: T) => string \| string[]` | A function called **per entity** in the broadcast payload. Returns the room(s) to target. All results are flattened and deduplicated. | `(item) => item.category` |

#### Static Rooms

Use a fixed room name when all broadcasts for a route should go to the same room, regardless of the entity data:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'CreateOne',
      broadcast: {
        enabled: true,
        rooms: 'products-room', // All CreateOne broadcasts go to 'products-room'
      },
    },
    {
      type: 'DeleteOne',
      broadcast: {
        enabled: true,
        rooms: ['watchers', 'inventory-managers'], // Broadcast to multiple rooms
      },
    },
  ],
})
```

**Client:**

```typescript
// Client A — joins the room, will receive broadcasts
socket.emit('join-rooms', { rooms: 'products-room' }, () => {
  console.log('Ready to receive product broadcasts');
});

socket.on('create-one-product', (data) => {
  console.log('New product (room broadcast):', data);
});

// Client B — did NOT join 'products-room', will NOT receive the broadcast
socket.on('create-one-product', (data) => {
  // ❌ This listener is never called because Client B is not in the room
});
```

#### Dynamic Rooms

Use a function to resolve the target room(s) from the entity data at broadcast time. This is ideal when different entities should be broadcast to different rooms:

```typescript
@Schema({ collection: 'products' })
class Product extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  category?: string; // 'electronics', 'clothing', 'food', etc.
}

DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: { path: 'products' },
  routes: [
    {
      type: 'CreateOne',
      webSocket: true,
      broadcast: {
        enabled: true,
        // Room is resolved from the created entity's category
        rooms: (product: Product) => product.category ?? 'uncategorized',
      },
    },
    {
      type: 'UpdateOne',
      broadcast: {
        enabled: true,
        // Can return multiple rooms
        rooms: (product: Product) => ['all-products', `category-${product.category}`],
      },
    },
  ],
})
```

**Client:**

```typescript
// Client subscribes to the 'electronics' category
socket.emit('join-rooms', { rooms: 'electronics' }, () => {
  console.log('Watching electronics');
});

socket.on('create-one-product', (data) => {
  console.log('New electronics product:', data);
  // ✅ Only received if the created product has category === 'electronics'
});

// Another client subscribes to 'clothing'
socket.emit('join-rooms', { rooms: 'clothing' }, () => {
  console.log('Watching clothing');
});
// This client will NOT receive broadcasts for electronics products
```

#### Dynamic Rooms with Multiple Entities

For routes that handle multiple entities (`CreateMany`, `UpdateMany`, `DuplicateMany`, `DeleteMany`), the `rooms` function is called **once per entity**. All resolved rooms are **deduplicated** before broadcasting:

```typescript
{
  type: 'CreateMany',
  broadcast: {
    enabled: true,
    rooms: (product: Product) => product.category ?? 'unknown',
  },
}

// If CreateMany creates:
//   [{ name: 'Laptop', category: 'electronics' }, { name: 'T-Shirt', category: 'clothing' }]
// Resolved rooms = ['electronics', 'clothing'] (deduplicated)
// The broadcast is sent to BOTH rooms with the full data array
```

#### Combining `rooms` with `enabled` Predicate

The `enabled` predicate is evaluated **before** rooms are resolved. Only entities that pass the `enabled` check are included in the broadcast payload, and rooms are resolved from **those filtered entities**:

```typescript
{
  type: 'UpdateMany',
  broadcast: {
    // Step 1: Only published products pass the filter
    enabled: (product, user) => product.status === 'published',
    // Step 2: Rooms are resolved from the filtered products only
    rooms: (product: Product) => product.category ?? 'general',
    eventName: 'products-published',
  },
}
```

#### Rooms for Auth Routes

Auth broadcast also supports `rooms`:

```typescript
DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['role', 'department'],
      broadcast: {
        enabled: true,
        fields: ['id', 'email', 'role', 'department'],
        rooms: (user) => `department-${user.department}`, // Broadcast login only to same department
      },
    },
    updateAccount: {
      broadcast: {
        enabled: true,
        fields: ['id', 'email', 'name'],
        rooms: 'admin-dashboard', // Static room for admin watchers
      },
    },
  },
})
```

#### Complete Example: Room-Targeted Broadcasting

**Server configuration:**

```typescript
// src/items/item.entity.ts
@Schema({ collection: 'items' })
class Item extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  category?: string;
}

// src/app.module.ts
DynamicApiModule.forFeature({
  entity: Item,
  controllerOptions: { path: 'items', apiTag: 'Item', isPublic: true },
  routes: [
    // WS route + static room
    {
      type: 'CreateOne',
      webSocket: true,
      broadcast: { enabled: true, rooms: 'items-room' },
    },
    // WS route + dynamic room resolved from entity
    {
      type: 'UpdateOne',
      webSocket: true,
      broadcast: {
        enabled: true,
        rooms: (item: Item) => item.category ?? 'unknown',
      },
    },
    // HTTP-only route + static room
    {
      type: 'DuplicateOne',
      broadcast: { enabled: true, rooms: 'items-room' },
    },
    // HTTP-only route + dynamic room
    {
      type: 'ReplaceOne',
      broadcast: {
        enabled: true,
        rooms: (item: Item) => item.category ?? 'unknown',
      },
    },
  ],
})
```

**Client integration:**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
});

// 1. Join the static room
socket.emit('join-rooms', { rooms: 'items-room' }, (res) => {
  console.log('Joined:', res.data); // ['items-room']
});

// 2. Join a dynamic room (matching a category)
socket.emit('join-rooms', { rooms: 'electronics' }, (res) => {
  console.log('Joined:', res.data); // ['electronics']
});

// 3. Listen for broadcasts
socket.on('create-one-item', (data) => {
  console.log('New item (static room):', data);
  // ✅ Received because we joined 'items-room'
});

socket.on('update-one-item', (data) => {
  console.log('Updated item (dynamic room):', data);
  // ✅ Received only if the updated item has category === 'electronics'
});

// 4. Create an item via WS — broadcast goes to 'items-room'
socket.emit('create-one-item', { name: 'Keyboard', category: 'electronics' }, (res) => {
  console.log('Created:', res.data);
});

// 5. Or create via HTTP — broadcast still goes to 'items-room'
await fetch('http://localhost:3000/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mouse', category: 'electronics' }),
});

// 6. Later, leave the room
socket.emit('leave-rooms', { rooms: 'items-room' }, (res) => {
  console.log('Left:', res.data); // ['items-room']
});
// After leaving, this client no longer receives 'create-one-item' broadcasts
```

---

## Available Events

When WebSocket is enabled for a route, clients can call that route using Socket.IO events instead of HTTP requests.

### Event Naming Convention

By default, events follow the pattern: `{route-type}-{displayed-name}` in kebab-case.

- **Displayed name** is determined by `apiTag` if provided, otherwise falls back to the entity class name
- **Format**: `kebabCase(routeType + '/' + displayedName)` where `displayedName = pascalCase((subPath ? subPath + '-' : '') + (apiTag ?? entityName))`
- **Priority**: `apiTag` takes precedence over `entityName`
- **Examples**: 
  - `User` entity (no apiTag) → `get-many-user`, `create-one-user`, `update-one-user`
  - `Product` entity with `apiTag: 'Items'` → `get-many-items`, `create-one-items` (apiTag is used instead)
  - `User` entity with `subPath: 'admin'` → `get-many-admin-user`, `create-one-admin-user`
  - `Product` entity with `apiTag: 'Items'` and `subPath: 'shop'` → `get-many-shop-items`, `create-one-shop-items`

You can customize event names using the `eventName` parameter in route configuration.

**Authentication Events (Fixed Names):**
- `auth-login` - User login
- `auth-register` - User registration
- `auth-get-account` - Get current user account
- `auth-update-account` - Update current user account
- `auth-reset-password` - Request password reset
- `auth-change-password` - Change password with reset token
- `auth-refresh-token` - Obtain a new token pair using the refresh token ⭐ *New in v4*
- `auth-logout` - Invalidate the current refresh token ⭐ *New in v4*

**Authentication Broadcast Events (Fixed Names):**
- `auth-login-broadcast` - Broadcast after login
- `auth-register-broadcast` - Broadcast after registration
- `auth-get-account-broadcast` - Broadcast after get account
- `auth-update-account-broadcast` - Broadcast after account update

### CRUD Route Events

| Route Type | Default Event Pattern | Example (User entity, no apiTag) | Example (Product entity, apiTag: 'Items') | Example (User entity, subPath: 'admin') |
|------------|----------------------|----------------------------------|-------------------------------------------|----------------------------------------|
| GetMany | `get-many-{displayed-name}` | `get-many-user` | `get-many-items` | `get-many-admin-user` |
| GetOne | `get-one-{displayed-name}` | `get-one-user` | `get-one-items` | `get-one-admin-user` |
| CreateOne | `create-one-{displayed-name}` | `create-one-user` | `create-one-items` | `create-one-admin-user` |
| CreateMany | `create-many-{displayed-name}` | `create-many-user` | `create-many-items` | `create-many-admin-user` |
| UpdateOne | `update-one-{displayed-name}` | `update-one-user` | `update-one-items` | `update-one-admin-user` |
| UpdateMany | `update-many-{displayed-name}` | `update-many-user` | `update-many-items` | `update-many-admin-user` |
| ReplaceOne | `replace-one-{displayed-name}` | `replace-one-user` | `replace-one-items` | `replace-one-admin-user` |
| DeleteOne | `delete-one-{displayed-name}` | `delete-one-user` | `delete-one-items` | `delete-one-admin-user` |
| DeleteMany | `delete-many-{displayed-name}` | `delete-many-user` | `delete-many-items` | `delete-many-admin-user` |
| DuplicateOne | `duplicate-one-{displayed-name}` | `duplicate-one-user` | `duplicate-one-items` | `duplicate-one-admin-user` |
| DuplicateMany | `duplicate-many-{displayed-name}` | `duplicate-many-user` | `duplicate-many-items` | `duplicate-many-admin-user` |

### Authentication Events

These event names are fixed and cannot be customized:

| Event | Description | Authentication Required |
|-------|-------------|------------------------|
| `auth-login` | User login | No |
| `auth-register` | User registration | Optional (based on config) |
| `auth-get-account` | Get current user account | Yes |
| `auth-update-account` | Update current user account | Yes |
| `auth-reset-password` | Request password reset email | No |
| `auth-change-password` | Change password with reset token | No (requires reset token) |
| `auth-refresh-token` | Obtain a new token pair (access + refresh) | Yes (refresh token via `JwtRefreshGuard`) ⭐ *New in v4* |
| `auth-logout` | Invalidate the current refresh token | Yes (refresh token via `JwtRefreshGuard`) ⭐ *New in v4* |

**Response Format for All Events:**
```typescript
{ event: string, data: T | T[] | number }
```

### How it Works

When you enable WebSocket on a route, clients can call that route using Socket.IO's `emit` method instead of making HTTP requests. The server will respond through the WebSocket connection.

**HTTP Way:**
```bash
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**WebSocket Way:**
```typescript
// With User entity (no apiTag, so entity class name is used as fallback)
socket.emit('create-one-user', {
  name: 'John Doe',
  email: 'john@example.com'
}, (response) => {
  console.log('Created user:', response.data);
});

// With apiTag: 'Users' (apiTag takes priority over entity name)
socket.emit('create-one-users', {
  name: 'John Doe',
  email: 'john@example.com'
}, (response) => {
  console.log('Created user:', response.data);
});
```

**Note:** The event name is generated from `apiTag` if provided, otherwise falls back to the entity class name, converted to kebab-case. If your entity class is `User` and no `apiTag` is set, the event will be `create-one-user`. If you set `apiTag: 'Users'`, it will be `create-one-users`.

---

## Authentication with WebSockets

### Enabling Authentication WebSocket Support

When you configure authentication with `useAuth` in `forRoot()`, you can enable WebSocket support for authentication routes:

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user.entity';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
      useAuth: {
        userEntity: User, // Your user entity
        webSocket: true,  // Enable WebSocket for auth routes
        // ... other auth options
      },
    }),
  ],
})
export class AppModule {}
```

### Authentication Event Names

Unlike CRUD route events which are generated from entity names, **authentication events have fixed names** and cannot be customized:

| Event | Description | Auth Required | Parameters |
|-------|-------------|---------------|------------|
| `auth-login` | Authenticate user | No | `{ email, password }` (or your loginField) |
| `auth-register` | Create new user account | No* | User registration data |
| `auth-get-account` | Get current user info | Yes | `{}` |
| `auth-update-account` | Update current user | Yes | Partial user data |
| `auth-reset-password` | Request password reset | No | `{ email }` |
| `auth-change-password` | Reset password with token | No** | `{ resetPasswordToken, newPassword }` |
| `auth-refresh-token` | Get new token pair | Yes (refresh token) ⭐ *v4* | `{}` (token via header or cookie) |
| `auth-logout` | Invalidate refresh token | Yes (refresh token) ⭐ *v4* | `{}` (token via header or cookie) |

\* May require authentication if `register.protected` is set to `true`  
\** Requires a valid reset token, not JWT authentication

**Broadcast event names for auth** (received by listening clients — not used to make requests):

| Broadcast Event | Triggered after | Customizable? |
|-----------------|----------------|---------------|
| `auth-login-broadcast` | Login (HTTP or WS) | ✅ via `broadcast.eventName` |
| `auth-register-broadcast` | Register (HTTP or WS) | ✅ via `broadcast.eventName` |
| `auth-get-account-broadcast` | Get Account (HTTP or WS) | ✅ via `broadcast.eventName` |
| `auth-update-account-broadcast` | Update Account (HTTP or WS) | ✅ via `broadcast.eventName` |

> These broadcast events are only emitted when `broadcast` is configured for the corresponding action. See the [Broadcasting Auth Events](./authentication.md#broadcasting-auth-events) section for full configuration details.

### Important Notes

1. **Fixed Event Names**: Authentication events always use the same names (`auth-*`) regardless of:
   - Your user entity name (e.g., `User`, `Account`, `Customer`)
   - The `apiTag` setting in your configuration
   - Any custom `eventName` parameters

2. **Global Configuration**: Authentication WebSocket is configured at the `forRoot()` level, not per-feature:
   ```typescript
   // ✅ Correct - Configure at forRoot level
   DynamicApiModule.forRoot('mongodb-uri', {
     useAuth: {
       userEntity: User,
       webSocket: true, // or { namespace: '/auth' }
     },
   })

   // ❌ Wrong - Cannot configure auth WebSocket at feature level
   DynamicApiModule.forFeature({
     entity: User,
     webSocket: true, // This only affects CRUD routes, not auth
   })
   ```

3. **Displayed Name in CRUD vs Auth**:
   ```typescript
   // If User is your auth entity in forRoot()
   DynamicApiModule.forRoot('mongodb-uri', {
     useAuth: {
       userEntity: User, // Entity name: "User"
       webSocket: true,
     },
   })
   
   // Also create User as a feature for CRUD operations
   DynamicApiModule.forFeature({
     entity: User,
     controllerOptions: {
       path: 'users',
       apiTag: 'Users', // Optional: customize displayed name in event names
     },
     webSocket: true,
   })
   
   // Result:
   // - Auth events: auth-login, auth-register, etc. (fixed names)
   // - CRUD events: create-one-users, get-many-users, etc. (based on apiTag)
   // - If no apiTag: create-one-user, get-many-user (falls back to entity name)
   ```

### Example: Complete Auth WebSocket Setup

```typescript
// src/app.module.ts
@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
      // Enable auth with WebSocket
      useAuth: {
        userEntity: User,
        webSocket: true,
        jwt: {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m',              // v4 default
          refreshSecret: process.env.JWT_REFRESH_SECRET, // Optional — falls back to `secret` if omitted
        },
        refreshToken: {                  // v4: refresh token configuration
          refreshTokenField: 'refreshToken',
          refreshTokenExpiresIn: '7d',
        },
        login: {
          loginField: 'email',
          passwordField: 'password',
        },
        register: {
          additionalFields: ['name', 'role'],
        },
      },
    }),
    // Also enable User CRUD via WebSocket (optional)
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
      },
      webSocket: true, // CRUD operations via WebSocket
    }),
  ],
})
export class AppModule {}

// client/src/auth.service.ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authentication via WebSocket
export const authService = {
  async login(email: string, password: string) {
    return new Promise((resolve, reject) => {
      socket.emit('auth-login', { email, password }, (response) => {
        if (response.event === 'auth-login') {
          // v4: response now returns { accessToken, refreshToken }
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          resolve(response.data);
        } else {
          reject(response);
        }
      });
    });
  },

  async register(userData: any) {
    return new Promise((resolve, reject) => {
      socket.emit('auth-register', userData, (response) => {
        if (response.event === 'auth-register') {
          // v4: register also returns { accessToken, refreshToken }
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          resolve(response.data);
        } else {
          reject(response);
        }
      });
    });
  },

  async getAccount() {
    return new Promise((resolve, reject) => {
      // Include JWT token in socket connection
      socket.emit('auth-get-account', {}, (response) => {
        if (response.event === 'auth-get-account') {
          resolve(response.data);
        } else {
          reject(response);
        }
      });
    });
  },

  // v4: refresh token endpoint
  async refreshTokens() {
    return new Promise((resolve, reject) => {
      // The refresh token must be sent in the socket auth or as data
      socket.emit('auth-refresh-token', {}, (response) => {
        if (response.event === 'auth-refresh-token') {
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          resolve(response.data);
        } else {
          reject(response);
        }
      });
    });
  },

  // v4: logout endpoint
  async logout() {
    return new Promise((resolve, reject) => {
      socket.emit('auth-logout', {}, (response) => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        resolve(response);
      });
    });
  },
};
```

### Authenticating WebSocket Connections

To access protected routes via WebSocket, send the JWT token with the connection. Two transport methods are supported:

**✅ Recommended — `auth.token` (Socket.IO handshake `auth` object):**

```typescript
import { io } from 'socket.io-client';

const token = localStorage.getItem('accessToken');

const socket = io('http://localhost:3000', {
  auth: {
    token: token, // ✅ Recommended: send JWT token via the auth object
  },
});

// Now you can call protected routes
socket.emit('auth-get-account', {}, (response) => {
  console.log('Current user:', response.data);
});
```

**⚠️ Deprecated — `query.accessToken` (query string):**

```typescript
import { io } from 'socket.io-client';

const token = localStorage.getItem('accessToken');

// ⚠️ Deprecated — will be removed in v5
const socket = io('http://localhost:3000', {
  query: {
    accessToken: token,
  },
});
```

> **Note:** The server resolves the token as `socket.handshake.auth.token ?? socket.handshake.query.accessToken`. The `query` method is supported for backward compatibility but exposes the token in URLs and server logs. Always prefer the `auth` object.

---

## Server-Side Room Assignment (onConnection)

The `onConnection` hook lets you run custom logic every time a new WebSocket connection is established — **after** JWT verification. This is ideal for automatically assigning sockets to rooms based on the authenticated user, setting up per-user subscriptions, or logging connections.

**Signature:**

```typescript
onConnection?: (socket: ExtendedSocket, user?: any) => void | Promise<void>;
```

- `socket` — the Socket.IO socket instance (extended with `socket.user` if a valid JWT was provided).
- `user` — the decoded JWT payload (`undefined` if the socket connected without a valid token).

### Example: Auto-join user-specific rooms

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  enableDynamicAPIWebSockets(app, {
    debug: true,
    onConnection: (socket, user) => {
      if (user) {
        // Auto-join the user to their personal room
        socket.join('user-' + user.id);

        // Join a role-based room
        if (user.role) {
          socket.join('role-' + user.role);
        }
      }
    },
  });

  await app.listen(3000);
}
bootstrap();
```

With this setup, you can target broadcasts to specific users or roles using the `rooms` option on your routes:

```typescript
DynamicApiModule.forFeature({
  entity: Notification,
  controllerOptions: { path: 'notifications' },
  routes: [
    {
      type: 'CreateOne',
      broadcast: {
        enabled: true,
        // Broadcast to the targeted user's personal room
        rooms: (notification) => 'user-' + notification.targetUserId,
      },
    },
  ],
})
```

### Example: Async onConnection with logging

```typescript
enableDynamicAPIWebSockets(app, {
  onConnection: async (socket, user) => {
    if (!user) {
      return; // Anonymous connection — skip room assignment
    }

    // Async operation: fetch user groups from DB and join rooms
    const groups = await GroupService.findGroupsByUser(user.id);
    groups.forEach((group) => socket.join('group-' + group.id));
  },
});
```

> **Note:** If the `onConnection` callback returns a `Promise` that rejects, the error is caught and logged by the adapter — it will **not** disconnect the socket.

---

## Debug Mode

Enable debug mode to get detailed logs from the WebSocket layer. This is useful during development to trace connection events, broadcasts, and room operations.

### Enabling Debug Mode

```typescript
enableDynamicAPIWebSockets(app, { debug: true });
```

### What is logged

When `debug: true`, the following events produce log output:

| Component | Log Example | When |
|-----------|-------------|------|
| **SocketAdapter** | `[WS] connection – socket=abc123, user=507f...` | Every new socket connection |
| **SocketAdapter** | `JWT verification failed for socket abc123: jwt expired` | JWT token is invalid or expired |
| **BroadcastGateway** | `[WS] joinRooms – socket=abc123, rooms=["electronics"]` | Client joins rooms |
| **BroadcastGateway** | `[WS] leaveRooms – socket=abc123, rooms=["electronics"]` | Client leaves rooms |
| **BaseGateway** | `[WS] broadcastIfNeeded – event=create-one-product, rooms=["shop"], items=1` | A broadcast is emitted |

> **Tip:** Keep `debug: false` (or omit it) in production to avoid excessive logging.

---

## Client Integration

### JavaScript/TypeScript Client

```typescript
// Using Socket.IO client
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3000');

// Call API routes via WebSocket instead of HTTP

// Get all users (entity 'User', no apiTag set, so 'user' is used)
socket.emit('get-many-user', { page: 1, limit: 10 }, (response) => {
  console.log('Users:', response.data);
});

// Get a single user
socket.emit('get-one-user', { id: '507f1f77bcf86cd799439011' }, (response) => {
  console.log('User:', response.data);
});

// Create a user
socket.emit('create-one-user', {
  name: 'John Doe',
  email: 'john@example.com'
}, (response) => {
  console.log('Created:', response.data);
});

// Update a user
socket.emit('update-one-user', {
  id: '507f1f77bcf86cd799439011',
  name: 'Jane Doe'
}, (response) => {
  console.log('Updated:', response.data);
});

// Delete a user
socket.emit('delete-one-user', { id: '507f1f77bcf86cd799439011' }, (response) => {
  console.log('Deleted:', response.data);
});

// Authentication events (fixed names)
// Login — v4: response.data now returns { accessToken, refreshToken }
socket.emit('auth-login', {
  email: 'user@example.com',
  password: 'mypassword'
}, (response) => {
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
});

// Register — v4: also returns { accessToken, refreshToken }
socket.emit('auth-register', {
  email: 'newuser@example.com',
  password: 'newpassword',
  name: 'New User'
}, (response) => {
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
});

// Get current account
socket.emit('auth-get-account', {}, (response) => {
  console.log('Account:', response.data);
});

// Update account
socket.emit('auth-update-account', {
  name: 'Updated Name'
}, (response) => {
  console.log('Updated account:', response.data);
});

// Reset password
socket.emit('auth-reset-password', {
  email: 'user@example.com'
}, (response) => {
  console.log('Password reset email sent');
});

// Change password
socket.emit('auth-change-password', {
  resetPasswordToken: 'token-from-email',
  newPassword: 'newpassword123'
}, (response) => {
  console.log('Password changed');
});

// v4: Refresh tokens — use refresh token in socket auth
// (reconnect socket with refresh token in auth.token, then emit)
socket.emit('auth-refresh-token', {}, (response) => {
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
});

// v4: Logout — invalidates the refresh token server-side
socket.emit('auth-logout', {}, () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
});

// Handle connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket');
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle exceptions
socket.on('exception', (error) => {
  console.error('API error:', error.message);
});
```

### React Client Example

```typescript
// hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(url);

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  const callRoute = <T,>(event: string, data: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit(event, data, (response: any) => {
        if (response.event) {
          resolve(response.data);
        } else {
          reject(response);
        }
      });
    });
  };

  return { socket, isConnected, callRoute };
}

// components/UserList.tsx
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const { isConnected, callRoute } = useWebSocket('http://localhost:3000');

  useEffect(() => {
    if (isConnected) {
      // Fetch users via WebSocket instead of HTTP
      // Entity 'User', no apiTag, so entity name 'user' is used
      callRoute<User[]>('get-many-user', { page: 1, limit: 10 })
        .then(data => setUsers(data))
        .catch(error => console.error('Error:', error));
    }
  }, [isConnected, callRoute]);

  const handleCreateUser = async () => {
    try {
      const newUser = await callRoute<User>('create-one-user', {
        name: 'New User',
        email: 'newuser@example.com'
      });
      
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (id: string) => {
    try {
      const updatedUser = await callRoute<User>('update-one-user', {
        id,
        name: 'Updated Name'
      });
      
      setUsers(prev =>
        prev.map(user => user.id === id ? updatedUser : user)
      );
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await callRoute('delete-one-user', { id });
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div>
      <h2>Users {isConnected && '🟢'}</h2>
      <button onClick={handleCreateUser}>Add User</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => handleUpdateUser(user.id)}>Edit</button>
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue Client Example

```typescript
// composables/useWebSocket.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url: string) {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);

  onMounted(() => {
    socket.value = io(url);

    socket.value.on('connect', () => {
      isConnected.value = true;
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });
  });

  onUnmounted(() => {
    socket.value?.disconnect();
  });

  return { socket, isConnected };
}

// components/UserList.vue
<template>
  <div>
    <h2>Users <span v-if="isConnected">🟢</span></h2>
    <ul>
      <li v-for="user in users" :key="user.id">
        {{ user.name }} - {{ user.email }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useWebSocket } from '../composables/useWebSocket';

interface User {
  id: string;
  name: string;
  email: string;
}

const users = ref<User[]>([]);
const { socket, isConnected } = useWebSocket('http://localhost:3000');

onMounted(async () => {
  const response = await fetch('http://localhost:3000/users');
  users.value = await response.json();
});

watch(socket, (newSocket) => {
  if (!newSocket) return;

  newSocket.on('user-create-one', (user: User) => {
    users.value.push(user);
  });

  newSocket.on('user-update-one', (updatedUser: User) => {
    const index = users.value.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  });

  newSocket.on('user-delete-one', (userId: string) => {
    users.value = users.value.filter(u => u.id !== userId);
  });
});
</script>
```

---

## Best Practices

### 1. Selective WebSocket Enablement

```typescript
// ✅ Good - Enable only for frequently-used routes
DynamicApiModule.forFeature({
  entity: Order,
  routes: [
    { type: 'GetMany', webSocket: true }, // Frequent polling
    { type: 'CreateOne', webSocket: true }, // Quick creation
    { type: 'DeleteOne', webSocket: false }, // Rare operation, HTTP is fine
  ],
})

// ❌ Avoid - Enabling WebSocket unnecessarily
DynamicApiModule.forRoot('mongodb-uri', {
  webSocket: true, // All routes now have WebSocket endpoints
})
```

### 2. Handle Connection Errors

```typescript
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show user notification
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Refresh data
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  // Fallback to polling
});
```

### 3. Clean Up Connections

```typescript
useEffect(() => {
  const socket = io('http://localhost:3000');

  // Use the socket to call routes
  socket.emit('get-many-user', {}, (response) => {
    console.log('Users:', response.data);
  });

  // Cleanup on unmount
  return () => {
    socket.disconnect();
  };
}, []);
```

### 4. Enable Only Needed Routes

```typescript
// ✅ Good - Enable only interactive routes
DynamicApiModule.forFeature({
  entity: Chat,
  routes: [
    { type: 'GetMany', webSocket: true }, // Frequent polling
    { type: 'CreateOne', webSocket: true }, // Quick creation
    { type: 'UpdateOne', webSocket: false }, // Rare operation, HTTP only
    { type: 'DeleteOne', webSocket: false }, // Rare operation, HTTP only
  ],
})

// ❌ Avoid - Enabling WebSocket unnecessarily
DynamicApiModule.forRoot('mongodb-uri', {
  webSocket: true, // All routes now have WebSocket endpoints
})
```

### 5. Use Custom Event Names When Appropriate

```typescript
// ✅ Good - Clear, descriptive custom names
DynamicApiModule.forFeature({
  entity: Order,
  routes: [
    {
      type: 'CreateOne',
      webSocket: true,
      eventName: 'place-order', // More intuitive than 'order-create-one'
    },
    {
      type: 'UpdateOne',
      webSocket: true,
      eventName: 'update-order-status', // Clear purpose
    },
  ],
})

// Client code is more readable
socket.emit('place-order', orderData, callback);
socket.emit('update-order-status', { id, status: 'shipped' }, callback);

// ❌ Avoid - Unnecessary or confusing names
{
  type: 'GetMany',
  eventName: 'xyz123', // Not descriptive
}
```

### 6. Connection Management

```typescript
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Fallback to HTTP if needed
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Refresh data after reconnection
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  // Switch to HTTP mode
});
```

---

## Examples

### Complete WebSocket Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for WebSocket
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });

  // Enable WebSockets
  enableDynamicAPIWebSockets(app, {
    maxListeners: 20,
  });

  await app.listen(3000);
  console.log('🚀 Application: http://localhost:3000');
  console.log('🔌 WebSocket: ws://localhost:3000');
}
bootstrap();

// src/users/users.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
      },
      webSocket: true, // All routes accessible via WebSocket
    }),
  ],
})
export class UsersModule {}

// client/src/services/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const wsService = new WebSocketService();

// client/src/App.tsx
import { useEffect, useState } from 'react';
import { wsService } from './services/websocket';

interface User {
  id: string;
  name: string;
  email: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Fetch users via WebSocket instead of HTTP
    wsService.socket.emit('get-many-user', { page: 1, limit: 10 }, (response: any) => {
      if (response.event === 'get-many-user') {
        setUsers(response.data);
      }
    });

    // Cleanup
    return () => {
      wsService.disconnect();
    };
  }, []);

  const handleCreateUser = () => {
    wsService.socket.emit('create-one-user', {
      name: 'New User',
      email: 'new@example.com',
    }, (response: any) => {
      if (response.event === 'create-one-user') {
        setUsers(prev => [...prev, response.data]);
      }
    });
  };

  const handleDeleteUser = (id: string) => {
    wsService.socket.emit('delete-one-user', { id }, (response: any) => {
      if (response.event === 'delete-one-user') {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    });
  };

  return (
    <div>
      <h1>User List (via WebSocket)</h1>
      <button onClick={handleCreateUser}>Add User</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

### Example with Custom Event Names

```typescript
// src/products/products.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Product,
      controllerOptions: {
        path: 'products',
      },
      routes: [
        {
          type: 'GetMany',
          webSocket: true,
          eventName: 'list-products', // Custom event name
        },
        {
          type: 'GetOne',
          webSocket: true,
          eventName: 'get-product', // Custom event name
        },
        {
          type: 'CreateOne',
          webSocket: true,
          eventName: 'add-product', // Custom event name
        },
        {
          type: 'UpdateOne',
          webSocket: true,
          eventName: 'modify-product', // Custom event name
        },
        {
          type: 'DeleteOne',
          webSocket: true,
          eventName: 'remove-product', // Custom event name
        },
      ],
    }),
  ],
})
export class ProductsModule {}

// client/src/services/productService.ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export const productService = {
  // Using custom event names
  async listProducts(query = {}) {
    return new Promise((resolve) => {
      socket.emit('list-products', query, (response) => {
        resolve(response.data);
      });
    });
  },

  async getProduct(id: string) {
    return new Promise((resolve) => {
      socket.emit('get-product', { id }, (response) => {
        resolve(response.data);
      });
    });
  },

  async addProduct(data: any) {
    return new Promise((resolve) => {
      socket.emit('add-product', data, (response) => {
        resolve(response.data);
      });
    });
  },

  async modifyProduct(id: string, updates: any) {
    return new Promise((resolve) => {
      socket.emit('modify-product', { id, ...updates }, (response) => {
        resolve(response.data);
      });
    });
  },

  async removeProduct(id: string) {
    return new Promise((resolve) => {
      socket.emit('remove-product', { id }, (response) => {
        resolve(response.data);
      });
    });
  },
};

// Usage in component
const products = await productService.listProducts({ page: 1, limit: 10 });
const product = await productService.getProduct('123');
await productService.addProduct({ name: 'New Product', price: 99.99 });
await productService.modifyProduct('123', { price: 89.99 });
await productService.removeProduct('123');
```

---

## Performance Considerations

### Connection Limits

Configure max listeners for the WebSocket server:

```typescript
// In main.ts
enableDynamicAPIWebSockets(app, { maxListeners: 50 }); // Max 50 listeners per event
```

> **⚠️ Deprecated:** `enableDynamicAPIWebSockets(app, 50)` still works but will be removed in v5.

### Event Throttling

For high-frequency updates, consider throttling on the client side:

```typescript
import { throttle } from 'lodash';

const handleUpdate = throttle((data) => {
  console.log('Throttled update:', data);
  // Update UI
}, 1000); // Max once per second

socket.on('user-update-one', handleUpdate);
```

---

## Related Documentation

- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation
- 🏗️ **[Entities](./entities.md)** - Define your data models
- 🔐 **[Authentication](./authentication.md)** - Secure WebSocket connections

---

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [NestJS WebSockets Guide](https://docs.nestjs.com/websockets/gateways)
- [WebSocket Best Practices](https://ably.com/topic/websockets)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)


























