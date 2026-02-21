[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

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
- [Available Events](#available-events)
  - [Authentication Events](#authentication-events-1)
- [Authentication with WebSockets](#authentication-with-websockets)
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
  
  // Enable WebSocket support
  enableDynamicAPIWebSockets(app);
  
  await app.listen(3000);
  console.log('🚀 HTTP Server: http://localhost:3000');
  console.log('🔌 WebSocket Server: ws://localhost:3000');
}
bootstrap();
```

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

By default, events follow the pattern `{route-type}-{entity-name}` in kebab-case (e.g., `create-one-products`, `get-many-users`). The entity name comes from the `apiTag` if provided, otherwise from the entity class name. You can customize the event name using the `eventName` parameter:

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


---

## Available Events

When WebSocket is enabled for a route, clients can call that route using Socket.IO events instead of HTTP requests.

### Event Naming Convention

By default, events follow the pattern: `{route-type}-{entity-name}` in kebab-case.

- **Entity name** comes from `apiTag` if provided, otherwise from the entity class name
- **Format**: `kebabCase(routeType + '/' + displayedName)` where `displayedName = pascalCase((subPath ? subPath + '-' : '') + (apiTag ?? entityName))`
- **Examples**: 
  - `User` entity → `get-many-user`, `create-one-user`, `update-one-user`
  - `Product` entity with `apiTag: 'Items'` → `get-many-items`, `create-one-items`
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

### CRUD Route Events

| Route Type | Default Event Pattern | Example (User entity) | Example (apiTag: 'Items') | Example (subPath: 'admin') |
|------------|----------------------|----------------------|---------------------------|---------------------------|
| GetMany | `get-many-{entity}` | `get-many-user` | `get-many-items` | `get-many-admin-user` |
| GetOne | `get-one-{entity}` | `get-one-user` | `get-one-items` | `get-one-admin-user` |
| CreateOne | `create-one-{entity}` | `create-one-user` | `create-one-items` | `create-one-admin-user` |
| CreateMany | `create-many-{entity}` | `create-many-user` | `create-many-items` | `create-many-admin-user` |
| UpdateOne | `update-one-{entity}` | `update-one-user` | `update-one-items` | `update-one-admin-user` |
| UpdateMany | `update-many-{entity}` | `update-many-user` | `update-many-items` | `update-many-admin-user` |
| ReplaceOne | `replace-one-{entity}` | `replace-one-user` | `replace-one-items` | `replace-one-admin-user` |
| DeleteOne | `delete-one-{entity}` | `delete-one-user` | `delete-one-items` | `delete-one-admin-user` |
| DeleteMany | `delete-many-{entity}` | `delete-many-user` | `delete-many-items` | `delete-many-admin-user` |
| DuplicateOne | `duplicate-one-{entity}` | `duplicate-one-user` | `duplicate-one-items` | `duplicate-one-admin-user` |
| DuplicateMany | `duplicate-many-{entity}` | `duplicate-many-user` | `duplicate-many-items` | `duplicate-many-admin-user` |

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
// With User entity (entity class name is used)
socket.emit('create-one-user', {
  name: 'John Doe',
  email: 'john@example.com'
}, (response) => {
  console.log('Created user:', response.data);
});

// With apiTag: 'Users' (apiTag is used instead of entity name)
socket.emit('create-one-users', {
  name: 'John Doe',
  email: 'john@example.com'
}, (response) => {
  console.log('Created user:', response.data);
});
```

**Note:** The event name is generated from `apiTag` if provided, otherwise from the entity class name, converted to kebab-case. If your entity class is `User`, the event will be `create-one-user`. If you set `apiTag: 'Users'`, it will be `create-one-users`.

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

\* May require authentication if `register.protected` is set to `true`  
\** Requires a valid reset token, not JWT authentication

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

3. **Entity Name in CRUD vs Auth**:
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
       apiTag: 'Users', // Optional: customize event names
     },
     webSocket: true,
   })
   
   // Result:
   // - Auth events: auth-login, auth-register, etc. (fixed names)
   // - CRUD events: create-one-users, get-many-users, etc. (based on apiTag)
   // - If no apiTag: create-one-user, get-many-user (based on entity name)
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
          expiresIn: '7d',
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
          // Store the JWT token
          localStorage.setItem('accessToken', response.data.accessToken);
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
};
```

### Authenticating WebSocket Connections

To access protected routes via WebSocket, send the JWT token with the connection:

```typescript
import { io } from 'socket.io-client';

const token = localStorage.getItem('accessToken');

const socket = io('http://localhost:3000', {
  auth: {
    token: token, // Send JWT token with connection
  },
});

// Now you can call protected routes
socket.emit('auth-get-account', {}, (response) => {
  console.log('Current user:', response.data);
});
```

---

## Client Integration

### JavaScript/TypeScript Client

```typescript
// Using Socket.IO client
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3000');

// Call API routes via WebSocket instead of HTTP

// Get all users (assuming entity is named 'User')
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
// Login
socket.emit('auth-login', {
  email: 'user@example.com',
  password: 'mypassword'
}, (response) => {
  console.log('Login response:', response.data);
  // response.data contains { user, accessToken }
});

// Register
socket.emit('auth-register', {
  email: 'newuser@example.com',
  password: 'newpassword',
  name: 'New User'
}, (response) => {
  console.log('Registration response:', response.data);
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
      // Assuming entity is named 'User' (singular)
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
enableDynamicAPIWebSockets(app, 50); // Max 50 listeners per event
```

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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)


























