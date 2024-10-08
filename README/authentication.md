[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **Authentication**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# [Authentication](https://docs.nestjs.com/recipes/passport#jwt-functionality)

An authentication strategy like <a href="https://docs.nestjs.com/security/authentication#jwt-token" target="_blank">JWT</a> is already implemented in the Dynamic API.
All you have to do is to pass the User object and some options to the `useAuth` property of the `DynamicApiModule.forRoot` method.

### **Basic Configuration**

Ok, let's update our `User` entity class to add a `password` field.

```typescript
// src/users/user.ts
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String })
  company?: string;
}
```

Now, we are going to add the `useAuth` property to the `DynamicApiModule.forRoot` method and pass the `User` object in its `user.entity` property.
<br>By default, the login field is `email` and the password field is `password`. Your User class must have these fields.
<br>If you want to use other fields, you can specify them in the `user` property by passing the `loginField` and / or `passwordField` properties.

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb-uri',
      {
        // ...,
        useAuth: { // <- add this
          user: {
            entity: User, // <- put here the entity which will represent a User of your API
          },
        },
      }
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

By setting the `useAuth` property, the Dynamic API will automatically add the authentication API.
<br>It will add the `/auth/register`, `/auth/login`, and `/auth/account` routes to the API.

By default, only the `/auth/register` and `/auth/login` routes are public.
All other routes are protected and require a valid `JWT token` to access them.**Usage**

Ok let's add a new user with the `POST` method on the `/auth/register` route.
<br>You will receive a valid `JWT token` in the response.

```text
# POST /auth/register

curl -X 'POST' \
  '<your-host>/auth/register' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "<your-email>",
  "password": "<your-password>" // <- the password will be hashed automatically before saving in the database
}'
```
```json
# Server response
{"accessToken":"<your-jwt-token>"}
```

If you go to `/auth/login` and request the route with the `POST` method passing the `email` and `password` fields in the body.
<br>You will also receive a valid `JWT token` in the response.

```text
# POST /auth/login

curl -X 'POST' \
  '<your-host>/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "<your-email>",
  "password": "<your-password>"
}'
```
```json
# Server response
{"accessToken":"<your-jwt-token>"}
```

Now let's request the `/auth/account` protected route with the `GET` method and pass our valid JWT token in the `Authorization` header.

```text
# GET /auth/account

curl -X 'GET' \
  '<your-host>/auth/account' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <your-jwt-token>'
```
```json
# Server response
{"id":"65edc717c1ec...","email":"<your-email>"}
```

Great, now you have a fully functional authentication API.

All other routes are protected and require a valid JWT token to be accessed.
<br>You can easily make it public by adding the `isPublic` property in the `DynamicApiModule.forFeature`
method:

- to the `controllerOptions` object

```typescript
// src/users/users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        isPublic: true, // <- add this to make all user API routes public
      },
      // ...
    }),
  ],
})
export class UsersModule {}
```

- or to the `route` object:

```typescript
// src/users/users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
      },
      routes: [
        { type: 'GetMany' }, // <- protected route
        { type: 'GetOne', isPublic: true }, // <- public route
        { type: 'UpdateOne' }, // <- protected route
        { type: 'DeleteOne' }, // <- protected route
      ],
    }),
  ],
})
export class UsersModule {}
```

### **Swagger Configuration**

For Swagger users, you must enable the bearer Auth option by setting the `bearerAuth` property to `true` in the enableDynamicAPISwagger method.
This will add the Authorize button in the Swagger UI. This button will allow you to pass the `JWT Token` and unlock the protected routes.

```typescript
// src/main.ts
import { enableDynamicAPISwagger } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPISwagger(app, {
    // ...,
    swaggerExtraConfig: { // <- add this line in your main.ts file
      bearerAuth: true,
    },
  });

  await app.listen(3000);
}
```

![Swagger UI - Authentication API](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-authentication.Jpeg?raw=true "Swagger UI - Authentication API")


#### Get account
![Get account](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-authentication-account.Jpeg?raw=true "Get account")

#### Login
![Login](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-authentication-login.Jpeg?raw=true "Login")

#### Register
![Register](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-authentication-register.Jpeg?raw=true "Register")


### **Advanced Configuration**

Ok, let's pimp our `User` entity class:
- add the `@DynamicAPISchemaOptions` decorator to specify the unique index on the `email` field
- extend the `SoftDeletableEntity` class from the `mongodb-dynamic-api` package to add the soft delete feature
- add a `password` field
- add a `isAdmin` field
- add the `@IsString` | `@IsNotEmpty` | `@IsBoolean` | `@IsEmail` | `@IsOptional` decorators to validate your class properties
- add the `@ApiProperty` | `@ApiPropertyOptional` decorators to have a better swagger documentation
- add the `@Exclude` decorator from the <a href="https://docs.nestjs.com/techniques/serialization#exclusion" target="_blank">class-transformer</a> package to exclude the `password` field from the response

```typescript
// src/users/user.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { Exclude } from 'class-transformer';
import {
  DynamicAPISchemaOptions,
  SoftDeletableEntity,
} from 'mongodb-dynamic-api';

@DynamicAPISchemaOptions({
  indexes: [{ fields: { email: 1, deletedAt: -1 }, options: { unique: true } }],
})
@Schema({ collection: 'users' })
export class User extends SoftDeletableEntity {
  @ApiProperty()
  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ type: Boolean, default: false })
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  company?: string;
}
```
```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb-uri',
      {
        useAuth: {
          user: {
            entity: User,
            requestAdditionalFields: ['isAdmin', 'company'],
          },
          register: {
            protected: true,
            additionalFields: [{ name: 'isAdmin', required: true }, 'company'],
          },
          jwt: {
            secret: 'your-custom-secret',
            expiresIn: '1h',
          },
        },
      },
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

By setting the `useAuth` property, the Dynamic API will automatically add the authentication API.
<br>It will add the `/auth/register`, `/auth/login`, and `/auth/account` routes to the API.

By default, only the `/auth/register` and `/auth/login` routes are public.
All other routes are protected and require a valid `JWT token` to access them.

**Usage**

Ok let's add a new user with the `POST` method on the `/auth/register` route.
<br>You will receive a valid `JWT token` in the response.

```text
POST /auth/register

curl -X 'POST' \
  '<your-host>/auth/register' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "<your-email>",
  "password": "<your-password>" // <- the password will be hashed automatically before saving in the database
}'
```
```json
# Server response
{"accessToken":"<your-jwt-token>"}
```

If you go to `/auth/login` and request the route with the `POST` method passing the `email` and `password` fields in the body.
<br>You will also receive a valid `JWT token` in the response.

```text
POST /auth/login

curl -X 'POST' \
  '<your-host>/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "<your-email>",
  "password": "<your-password>"
}'
```
```json
# Server response
{"accessToken":"<your-jwt-token>"}
```

Now let's request the `/auth/account` protected route with the `GET` method and pass our valid JWT token in the `Authorization` header.

```text
GET /auth/account

curl -X 'GET' \
  '<your-host>/auth/account' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <your-jwt-token>'
```
```json
# Server response
{"id":"65edc717c1ec...","email":"<your-email>"}
```

Great, now you have a fully functional authentication API.

All other routes are protected and require a valid JWT token to be accessed.
<br>You can easily make it public by adding the `isPublic` property to the `controllerOptions` object or to the `route` object in the `DynamicApiModule.forFeature` method.

```typescript
// src/users/users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        isPublic: true, // <- add this to make all user API routes public
      },
      // ...
    }),
  ],
})
export class UsersModule {}
```
```typescript
// src/users/users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
      },
      routes: [
        { type: 'GetMany' }, // <- protected route
        { type: 'GetOne', isPublic: true }, // <- public route
        { type: 'UpdateOne' }, // <- protected route
        { type: 'DeleteOne' }, // <- protected route
      ],
    }),
  ],
})
export class UsersModule {}
```

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **Authentication**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>