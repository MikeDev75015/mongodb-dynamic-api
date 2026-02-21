[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Authentication (JWT)

JWT authentication is built-in and provides secure, token-based authentication for your API. Configure the `useAuth` property in `DynamicApiModule.forRoot` to enable authentication endpoints.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Generated Endpoints](#generated-endpoints)
- [Advanced Configuration](#advanced-configuration)
  - [Custom Login Fields](#custom-login-fields)
  - [Protected Registration](#protected-registration)
  - [Ability Predicates for Authentication Routes](#ability-predicates-for-authentication-routes)
  - [JWT Payload Customization](#jwt-payload-customization)
  - [Update Account Configuration](#update-account-configuration)
  - [Reset Password Configuration](#reset-password-configuration)
  - [Callbacks and Lifecycle Hooks](#callbacks-and-lifecycle-hooks)
  - [Interceptors](#interceptors)
  - [Validation Options](#validation-options)
  - [WebSocket Support](#websocket-support)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Step 1: Define Your User Entity

Create a user entity with authentication fields:

```typescript
// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsNotEmpty()
  @MinLength(8)
  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @Prop({ type: String })
  name?: string;

  @ApiProperty({ example: 'user' })
  @Prop({ type: String, default: 'user' })
  role?: string;
}
```

### Step 2: Enable Authentication

Configure authentication in your root module:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user.entity';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp', {
      useAuth: {
        userEntity: User,
      },
    }),
  ],
})
export class AppModule {}
```

**🎉 Done!** Your API now has authentication endpoints at `/auth/register`, `/auth/login`, and `/auth/account`.

---

## Configuration Options

### All Available Options

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    // REQUIRED
    userEntity: User,
    
    // JWT Configuration
    jwt: {
      secret: string;
      expiresIn?: string | number;
    },
    
    // Login Configuration
    login: {
      loginField?: keyof Entity;              // Default: 'email'
      passwordField?: keyof Entity;           // Default: 'password'
      callback?: (user: Entity) => void;      // After login
      abilityPredicate?: (user, body?) => boolean;
      additionalFields?: (keyof Entity)[];    // JWT payload fields
      useInterceptors?: Type<NestInterceptor>[];
    },
    
    // Register Configuration
    register: {
      beforeSaveCallback?: (user: Entity) => Entity;
      callback?: (user: Entity) => void;
      protected?: boolean;                     // Require auth to register
      abilityPredicate?: (user, body?) => boolean;
      additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
      useInterceptors?: Type<NestInterceptor>[];
    },
    
    // Update Account Configuration
    updateAccount: {
      beforeSaveCallback?: (user: Entity, updateDto) => Entity;
      callback?: (user: Entity) => void;
      abilityPredicate?: (user, body?) => boolean;
      additionalFieldsToExclude?: (keyof Entity)[]; // Fields to exclude from update
      useInterceptors?: Type<NestInterceptor>[];
    },
    
    // Reset Password Configuration
    resetPassword: {
      emailField?: keyof Entity | string;     // Field for email (default: loginField)
      expirationInMinutes?: number;           // Token expiration (default: 60)
      beforeChangePasswordCallback?: (user: Entity) => Entity;
      resetPasswordCallback?: (user: Entity, resetToken: string) => void; // Send token
      resetPasswordUseInterceptors?: Type<NestInterceptor>[];
      changePasswordCallback?: (user: Entity) => void;
      changePasswordAbilityPredicate?: (user, body?) => boolean;
      changePasswordUseInterceptors?: Type<NestInterceptor>[];
    },
    
    // Global Options
    validationPipeOptions?: ValidationPipeOptions; // Apply to all auth routes
    webSocket?: boolean | WebSocketOptions;        // Enable WebSocket
    extraImports?: ModuleMetadata['imports'];      // Additional imports
    extraProviders?: ModuleMetadata['providers'];  // Additional providers
    extraControllers?: ModuleMetadata['controllers']; // Additional controllers
  },
})
```

### Basic Configuration

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    // Customize login field (default: 'email')
    login: {
      loginField: 'username',
      // Customize password field (default: 'password')
      passwordField: 'pass',
      // Request additional fields in JWT payload
      additionalFields: ['role', 'isActive'],
    },
  },
})
```

### Advanced Configuration

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '7d', // Token expiration
    },
    // Customize login
    login: {
      loginField: 'email',
      passwordField: 'password',
      additionalFields: ['role', 'name', 'isAdmin'],
    },
    // Customize registration
    register: {
      // Add additional fields during registration
      additionalFields: [
        { name: 'name', required: false },
        { name: 'role', required: false },
        { name: 'company', required: false },
      ],
      // Protect registration endpoint
      protected: true,
      // Custom callback after registration
      callback: async (user: User) => {
        // Send welcome email, log event, etc.
        console.log(`New user registered: ${user.email}`);
      },
    },
  },
})
```

---

## Generated Endpoints

Authentication automatically generates **five endpoints**:

### 1. Register a New User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "user"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

**Note:** Password is automatically hashed before saving.

### 2. Login

**POST** `/auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### 3. Get Account Information

**GET** `/auth/account`

Retrieve the authenticated user's account information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

### 4. Update Account

**PATCH** `/auth/account`

Update the authenticated user's account information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "name": "John Smith",
  "role": "editor"
}
```

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "name": "John Smith",
  "role": "editor",
  "updatedAt": "2026-02-21T11:00:00.000Z"
}
```

**Note:** By default, `loginField` (email/username) and `passwordField` are excluded from updates. Use `additionalFieldsToExclude` to exclude more fields.

### 5. Reset/Change Password

**POST** `/auth/reset-password`

Request a password reset (generates a reset token).

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (204 No Content)**

---

**PATCH** `/auth/change-password`

Change password using the reset token.

**Request Body:**
```json
{
  "resetPasswordToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword456!"
}
```

**Response (204 No Content)**

**Note:** Password reset is optional. It's only enabled if you configure `resetPassword` options. You need to implement `resetPasswordCallback` to send the reset token (e.g., via email).

---

## Advanced Configuration

### Custom Login Field

Use username instead of email:

```typescript
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true, unique: true })
  username: string;

  @Prop({ type: String, required: true })
  password: string;
}

// Configuration
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    user: { 
      entity: User,
      loginField: 'username',
    },
  },
})
```

### Protected Registration

Restrict registration to authenticated users only:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    register: {
      protected: true,
      additionalFields: [
        { name: 'role', required: true },
        { name: 'isAdmin', required: true },
      ],
    },
  },
})
```

### Ability Predicates for Authentication Routes

Control access to authentication endpoints using ability predicates. **Note:** Authentication predicates have a different signature than regular route predicates.

**Signature:** `(user: User, body?: Body) => boolean`

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      // Control who can login (e.g., block suspended accounts)
      abilityPredicate: (user, body) => {
        return user.isActive && !user.isSuspended;
      },
    },
    register: {
      protected: true,
      // Control who can register new users (e.g., only admins)
      abilityPredicate: (user, body) => {
        return user.role === 'admin';
      },
    },
    updateAccount: {
      // Control who can update their account
      abilityPredicate: (user, body) => {
        // Users can update their own accounts, but can't change role
        if (body?.role && body.role !== user.role) {
          return user.role === 'admin'; // Only admins can change roles
        }
        return true;
      },
    },
    resetPassword: {
      // Control who can change password
      changePasswordAbilityPredicate: (user, body) => {
        // User must verify old password or be an admin
        return user.hasVerifiedEmail || user.role === 'admin';
      },
    },
  },
})
```

**Key Differences from Regular Route Predicates:**

| Type | Signature | Context |
|------|-----------|---------|
| **Auth Predicate** | `(user, body?) => boolean` | Authentication routes (login, register, etc.) |
| **Regular Route Predicate** | `(entity, user) => boolean` | CRUD routes (GetOne, UpdateOne, etc.) |

**Common Use Cases:**

```typescript
// 1. Block suspended users from logging in
login: {
  abilityPredicate: (user) => user.status !== 'suspended',
}

// 2. Restrict registration to specific domains
register: {
  abilityPredicate: (user, body) => {
    return body?.email?.endsWith('@company.com');
  },
}

// 3. Prevent role escalation in account updates
updateAccount: {
  abilityPredicate: (user, body) => {
    // Regular users can't make themselves admin
    if (body?.role === 'admin' && user.role !== 'admin') {
      return false;
    }
    return true;
  },
}

// 4. Organization-based access control
register: {
  protected: true,
  abilityPredicate: (user, body) => {
    // Only org admins can register users in their org
    return user.role === 'org_admin' && 
           body?.organizationId === user.organizationId;
  },
}
```

### JWT Payload Customization

Include additional user data in JWT tokens:

```typescript
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, default: 'user' })
  role: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  organizationId?: string;
}

// Configuration
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      additionalFields: ['role', 'isActive', 'organizationId'],
    },
  },
})
```

Now your JWT payload will include these fields:
```json
{
  "sub": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "role": "admin",
  "isActive": true,
  "organizationId": "507f1f77bcf86cd799439012",
  "iat": 1709294400,
  "exp": 1709899200
}
```

### Update Account Configuration

Configure which fields users can update in their account:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    updateAccount: {
      // Exclude additional fields from updates
      additionalFieldsToExclude: ['credits', 'subscriptionLevel', 'verifiedAt'],
      // Callback before saving changes
      beforeSaveCallback: async (user, updateDto) => {
        // Custom validation or transformation
        if (updateDto.email) {
          // Re-verify email if changed
          user.emailVerified = false;
        }
        return user;
      },
      // Callback after update
      callback: async (user) => {
        console.log(`User ${user.id} updated their account`);
      },
      // Control who can update account
      abilityPredicate: (user, body) => {
        // Prevent role escalation
        if (body?.role && body.role !== user.role) {
          return user.role === 'admin';
        }
        return true;
      },
      // Add interceptors
      useInterceptors: [LoggingInterceptor],
    },
  },
})
```

**Note:** By default, `loginField` and `passwordField` are automatically excluded from updates.

### Reset Password Configuration

Enable password reset functionality with email notifications:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    resetPassword: {
      // Field to use for reset (default: same as loginField)
      emailField: 'email',
      // Token expiration in minutes (default: 60)
      expirationInMinutes: 30,
      // Callback before changing password
      beforeChangePasswordCallback: async (user) => {
        // Custom logic before password change
        user.passwordChangedAt = new Date();
        return user;
      },
      // Callback to send reset token (REQUIRED for reset to work)
      resetPasswordCallback: async (user, resetToken) => {
        // Send email with reset token
        await emailService.sendPasswordResetEmail(user.email, resetToken);
        console.log(`Password reset requested for ${user.email}`);
      },
      // Callback after password changed
      changePasswordCallback: async (user) => {
        console.log(`Password changed for ${user.id}`);
      },
      // Control who can change password
      changePasswordAbilityPredicate: (user, body) => {
        return user.isActive === true;
      },
      // Add interceptors
      resetPasswordUseInterceptors: [RateLimitInterceptor],
      changePasswordUseInterceptors: [LoggingInterceptor],
    },
  },
})
```

**Reset Password Flow:**
1. User calls `POST /auth/reset-password` with their email
2. System generates a JWT reset token
3. Your `resetPasswordCallback` is called to send the token (email, SMS, etc.)
4. User receives the token and calls `PATCH /auth/change-password` with token + new password
5. Password is updated

**Note:** If `resetPassword` is not configured or `emailField` is missing, both reset endpoints are hidden.

### Callbacks and Lifecycle Hooks

All authentication routes support callbacks:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      // After successful login
      callback: async (user) => {
        // Update last login timestamp
        user.lastLoginAt = new Date();
        await userRepository.save(user);
      },
    },
    register: {
      // Before saving new user
      beforeSaveCallback: async (user) => {
        // Set default values
        user.role = 'user';
        user.credits = 100;
        return user;
      },
      // After registration complete
      callback: async (user) => {
        // Send welcome email
        await emailService.sendWelcomeEmail(user.email);
      },
    },
    updateAccount: {
      beforeSaveCallback: async (user, updateDto) => {
        // Validate changes
        if (updateDto.email && updateDto.email !== user.email) {
          user.emailVerified = false;
        }
        return user;
      },
      callback: async (user) => {
        // Notify user of changes
        await emailService.sendAccountUpdatedEmail(user.email);
      },
    },
  },
})
```

### Interceptors

Add custom interceptors to authentication routes:

```typescript
import { LoggingInterceptor, TransformInterceptor } from './interceptors';

DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    login: {
      useInterceptors: [LoggingInterceptor],
    },
    register: {
      useInterceptors: [LoggingInterceptor, TransformInterceptor],
    },
    updateAccount: {
      useInterceptors: [LoggingInterceptor],
    },
    resetPassword: {
      resetPasswordUseInterceptors: [RateLimitInterceptor],
      changePasswordUseInterceptors: [LoggingInterceptor],
    },
  },
})
```

### Validation Options

Apply custom validation to all auth routes:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    validationPipeOptions: {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  },
})
```

### WebSocket Support

Enable WebSocket for authentication routes:

```typescript
DynamicApiModule.forRoot('mongodb-uri', {
  useAuth: {
    userEntity: User,
    webSocket: true, // or { namespace: '/auth' }
  },
})
```

Now authentication is available via Socket.IO:
- Event: `auth-login`
- Event: `auth-register`
- Event: `auth-reset-password`

---

## Best Practices

### 1. Environment Variables

Always use environment variables for sensitive configuration:

```typescript
// .env
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/myapp

// src/config/auth.config.ts
export const authConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

// src/app.module.ts
import { authConfig } from './config/auth.config';

DynamicApiModule.forRoot(process.env.MONGODB_URI, {
  useAuth: {
    userEntity: User,
    jwt: authConfig,
  },
})
```

### 2. Password Hashing

Passwords are automatically hashed using bcrypt with a salt rounds of 10. You can customize this:

```typescript
import * as bcrypt from 'bcrypt';

// In your user entity pre-save hook
@DynamicAPISchemaOptions({
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: async function(this: any) {
        if (this.isModified('password')) {
          this.password = await bcrypt.hash(this.password, 12);
        }
      },
    },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  // ...
}
```

### 3. Password Validation

Use class-validator for strong password requirements:

```typescript
import { Matches, MinLength } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  @Prop({ type: String, required: true })
  password: string;
}
```

### 4. Token Security

- ✅ Use HTTPS in production
- ✅ Set appropriate token expiration times
- ✅ Implement token refresh mechanism
- ✅ Store tokens securely (httpOnly cookies or secure storage)
- ✅ Implement token revocation if needed
- ✅ Use strong, random JWT secrets

### 5. Rate Limiting

Protect authentication endpoints from brute force attacks using NestJS Throttler.

> **Note:** Rate limiting requires the optional `@nestjs/throttler` package:
> ```bash
> npm install --save @nestjs/throttler
> ```

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    DynamicApiModule.forRoot('mongodb-uri', {
      useAuth: { userEntity: User },
    }),
  ],
})
export class AppModule {}
```

---

## Examples

### Complete Authentication Setup

```typescript
// src/users/user.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity, DynamicAPISchemaOptions } from 'mongodb-dynamic-api';
import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty({ 
    description: 'User email address',
    example: 'john.doe@example.com' 
  })
  @IsEmail()
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @ApiProperty({ 
    description: 'User password (min 8 characters)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @Exclude({ toPlainOnly: true })
  @Prop({ type: String, required: true })
  password: string;

  @ApiPropertyOptional({ 
    description: 'User full name',
    example: 'John Doe' 
  })
  @Prop({ type: String })
  name?: string;

  @ApiProperty({ 
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin', 'moderator'] 
  })
  @Prop({ type: String, enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;

  @ApiProperty({ 
    description: 'Account status',
    example: true 
  })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiPropertyOptional({ 
    description: 'Last login timestamp' 
  })
  @Prop({ type: Date })
  lastLoginAt?: Date;
}

// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler'; // Optional: npm install --save @nestjs/throttler
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot({ // Optional: for rate limiting
      ttl: 60,
      limit: 10,
    }),
    DynamicApiModule.forRoot(process.env.MONGODB_URI, {
      useAuth: {
        userEntity: User,
        jwt: {
          secret: process.env.JWT_SECRET,
          expiresIn: '7d',
        },
        login: {
          loginField: 'email',
          passwordField: 'password',
          additionalFields: ['role', 'isActive', 'name'],
        },
        register: {
          additionalFields: [
            { name: 'name', required: false },
          ],
          callback: async (user: User) => {
            console.log(`New user registered: ${user.email}`);
            // Send welcome email, create default settings, etc.
          },
        },
      },
    }),
  ],
})
export class AppModule {}

// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIValidation } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation
  enableDynamicAPIValidation(app);
  
  // Enable CORS if needed
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  
  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('🔐 Authentication endpoints:');
  console.log('   POST /auth/register');
  console.log('   POST /auth/login');
  console.log('   GET  /auth/account');
}
bootstrap();
```

### Using Authentication in Your Application

```typescript
// Frontend example (using fetch)
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (response.ok) {
    // Store token securely
    localStorage.setItem('access_token', data.access_token);
    return data.user;
  } else {
    throw new Error(data.message);
  }
}

async function getAccount() {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:3000/auth/account', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}

async function makeAuthenticatedRequest(url: string, options = {}) {
  const token = localStorage.getItem('access_token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

---

## Related Documentation

- 🛡️ **[Authorization](./authorization.md)** - Protect routes with ability predicates
- ✅ **[Validation](./validation.md)** - Validate request data
- 📚 **[Swagger UI](./swagger-ui.md)** - API documentation

---

## Additional Resources

- [NestJS Authentication Guide](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)




















