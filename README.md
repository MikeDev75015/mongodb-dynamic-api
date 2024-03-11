<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

[![NPM version](https://img.shields.io/npm/v/mongodb-dynamic-api.svg)](https://www.npmjs.com/package/mongodb-dynamic-api)
![NPM](https://img.shields.io/npm/l/mongodb-dynamic-api?registry_uri=https%3A%2F%2Fregistry.npmjs.com)
![npm](https://img.shields.io/npm/dw/mongodb-dynamic-api)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![GitHub branch checks state](https://img.shields.io/github/checks-status/MikeDev75015/mongodb-dynamic-api/main)
[![CircleCI](https://circleci.com/gh/MikeDev75015/mongodb-dynamic-api.svg?style=shield)](https://app.circleci.com/pipelines/github/MikeDev75015/mongodb-dynamic-api)
![Sonar Quality Gate](https://img.shields.io/sonar/quality_gate/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![Sonar Tests](https://img.shields.io/sonar/tests/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
![Sonar Coverage](https://img.shields.io/sonar/coverage/MikeDev75015_mongodb-dynamic-api?server=https%3A%2F%2Fsonarcloud.io)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=security_rating)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=ncloc)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=MikeDev75015_mongodb-dynamic-api&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=MikeDev75015_mongodb-dynamic-api)
</div>
</div>

<div style="text-align: center; width: 100%;">
<div style="display: inline-block">

![GitHub top language](https://img.shields.io/github/languages/top/MikeDev75015/mongodb-dynamic-api)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/MikeDev75015/mongodb-dynamic-api)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/MikeDev75015/mongodb-dynamic-api)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/MikeDev75015/mongodb-dynamic-api/main)
</div>
</div>

---

<div style="text-align: center; width: 100%;">

# mongodb-dynamic-api

</div>


<p style="text-align: justify; width: 100%;font-size: 15px;">

**mongodb-dynamic-api** is an auto generated CRUD API for MongoDB using NestJS 10.

</p>

---

## npm package <img src="https://pbs.twimg.com/media/EDoWJbUXYAArclg.png" width="24" height="24" />
```text
npm install --save mongodb-dynamic-api
```

___

### Table of Contents

[Swagger UI](#swagger-ui--optional-but-strongly-recommended)
<br>[Validation](#validation--optional)
<br>[Versioning](#versioning--optional)
<br>[Caching](#caching--enabled-by-default)
<br>[Authentication](#authentication--optional)
<br>[Casl](#casl--only-with-authentication)

---
### HOW TO ENJOY IT

- Start a new [nest](https://docs.nestjs.com/) project with **typescript** (use the `--strict` option)
```text
nest new --strict your-project-name
```

- Go to your project root and install the [mongodb-dynamic-api](https://www.npmjs.com/package/mongodb-dynamic-api) package
```text
npm i -S mongodb-dynamic-api
```
**Basic Configuration**

- Add `DynamicApiModule.forRoot` to your `app.module.ts` and pass your **MongoDB connection string** to the method.

```typescript
// app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb://127.0.0.1:27017/dynamic-api-db', // <- replace by your own connection string
    ),
    // ...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
**Basic Usage**

- Ok, now let's add our first content with just 2 files. It will be a simple `User` with a `name` and an `email` field.
- We use the `@Schema` and `@Prop` decorators from the `@nestjs/mongoose` package to define our MongoDB model. <br>*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/techniques/mongodb#model-injection" target="_blank">documentation</a> for more details.*


- You must extend the `BaseEntity` (or `SoftDeletableEntity`) class from the `mongodb-dynamic-api` package **for all your collection models**.
- Just create a new file `user.ts` and add the following code.

```typescript
// users/user.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}
```

- Then we will use the `DynamicApiModule.forFeature` method to add the `User` content.
- We pass the `User` class to the `entity` property and specify the path `users` to the `controllerOptions` property.
- Create a new file `users.module.ts` and add the following code.

```typescript
// users/users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
      },
    }),
  ],
})
export class UsersModule {}
```

- Last step, add the `UsersModule` to the **imports** in the `app.module.ts` after the `DynamicApiModule.forRoot` method.

```typescript
// app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DynamicApiModule.forRoot('...'),
    // ...
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**And that's all !** *You now have a fully functional CRUD API for the `User` content at the `/users` path.*



| Endpoint                                          |                      Body                      |    Param     |      Query      |
|:--------------------------------------------------|:----------------------------------------------:|:------------:|:---------------:|
| **GET /users**               <br>*Get many*       |                       x                        |      x       |        x        |
| **GET /users/:id**           <br>*Get one*        |                       x                        | `id: string` |        x        |
| **POST /users/many**         <br>*Create many*    | `{ list: [{ name: string; email: string; }] }` |      x       |        x        |
| **POST /users**              <br>*Create one*     |       `{ name: string; email: string; }`       |      x       |        x        |
| **PUT /users/:id**           <br>*Replace one*    |       `{ name: string; email: string; }`       | `id: string` |        x        |
| **PATCH /users**             <br>*Update many*    |      `{ name?: string; email?: string; }`      |      x       | `ids: string[]` |
| **PATCH /users/:id**         <br>*Update one*     |      `{ name?: string; email?: string; }`      | `id: string` |        x        |
| **DELETE /users**            <br>*Delete many*    |                       x                        |      x       | `ids: string[]` |
| **DELETE /users/:id**        <br>*Delete one*     |                       x                        | `id: string` |        x        |
| **POST /users/duplicate**    <br>*Duplicate many* |      `{ name?: string; email?: string; }`      |      x       | `ids: string[]` |
| **POST /users/duplicate/:id**<br>*Duplicate one*  |      `{ name?: string; email?: string; }`      | `id: string` |        x        |


### [Swagger UI](https://docs.nestjs.com/openapi/introduction#document-options) (optional but strongly recommended)
`function enableDynamicAPISwagger(app: INestApplication, options?: DynamicAPISwaggerOptions): void`

**Configuration**

```typescript
// main.ts
import { enableDynamicAPISwagger } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPISwagger(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```

The `enableDynamicAPISwagger` function will automatically build the swagger documentation.
<br>This method can be called with optional parameters to specify more documentation options.
<br>*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/openapi/introduction#document-options" target="_blank">documentation</a> for more details.*

**Usage**

Add the `@ApiProperty` | `@ApiPropertyOptional` decorators to your class properties to have a better swagger documentation.
<br>Let's add an optional company field to the `User` class.

```typescript
// user.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty() // <- add this line
  @Prop({ type: String, required: true })
  name: string;
  
  @ApiProperty() // <- add this line
  @Prop({ type: String, required: true })
  email: string;

  @ApiPropertyOptional() // <- add this line
  @Prop({ type: String })
  company?: string;
}
```

go to the swagger API path (default to `/dynamic-api`) and you will see the auto generated API

![User API](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-user-full.Jpeg?raw=true "User API")

<a href="https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-user-api.md" target="_blank">See more User API screenshots</a>

___
### [Validation](https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe) (optional)
`function enableDynamicAPIValidation(app: INestApplication, options?: ValidationPipeOptions): void`

**Configuration**

```typescript
// main.ts
import { enableDynamicAPIValidation } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPIValidation(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```
The `enableDynamicAPIValidation` function allow to configure the pipe validation options for the API globally.

You can also define the pipe validation options in the `DynamicApiModule.forFeature` method, either in the controller options,
or in each route object defined in the routes property.
<br>*If the options are specified in 2, the options specified in the route will have priority.*

```typescript
// users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        // ...
        validationPipeOptions: { // <- in the controller options
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        },
      },
      routes: [
        {
          type: 'DuplicateOne',
          validationPipeOptions: { transform: true }, // <- in the route options
        },
      ],
    }),
  ],
})
export class UsersModule {}
```

**Usage**

Use the `Class validator` <a href="https://github.com/typestack/class-validator?tab=readme-ov-file#validation-decorators" target="_blank">decorators</a> to validate your class properties.
<br>Let's add `IsEmail` decorator to the `email` field.

```typescript
// user.ts
import { IsEmail } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty()
  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;

  @ApiPropertyOptional()
  @Prop({ type: String })
  company?: string;
}
```

Ok, now if you try to create a new user with an invalid email, you will get a `400 Bad Request` error.

![User API Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-validation.Jpeg?raw=true "User API Validation")


___
### [Versioning](https://docs.nestjs.com/techniques/versioning) (optional)
`function enableDynamicAPIVersioning(app: INestApplication, options?: VersioningOptions): void`

The `enableDynamicAPIVersioning` function will automatically add versioning to the API.
<br>By default, it will use the <strong>URI versioning type</strong>.
<br>This method can be called with a second <strong>optional parameter</strong> to specify custom options.
<br>*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/techniques/versioning" target="_blank">documentation</a> for more details.*

**Configuration**

```typescript
// main.ts
import { enableDynamicAPIVersioning } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPIVersioning(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```

**Usage**

Pass the `version` property to the `controllerOptions` object or to the `route` object in the `DynamicApiModule.forFeature` method.
<br>*If the version is specified in 2, the version specified in the route will have priority.*

Let's add a new version to the `User` content.

```typescript
// create-one-user-v2.dto.ts
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { User } from './user';

export class CreateOneUserV2Dto extends PickType(User, ['email']) {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;
}
```

```typescript
// user-v2.presenter.ts
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { User } from './user';

export class UserV2Presenter extends PickType(User, ['email']) {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  country?: string;
}
```

```typescript
// users.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user';
import { CreateOneUserV2Dto } from './create-one-user-v2.dto';
import { UserV2Presenter } from './user-v2.presenter';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: {
        path: 'users',
        version: '1', // <- add this line
      },
      routes: [
        { type: 'GetMany' },
        { type: 'GetOne' },
        {
          type: 'CreateOne',
          dTOs: {
            body: CreateOneUserV2Dto,
            presenter: UserV2Presenter,
          },
          version: '2', // <- add this line
        },
      ],
    }),
  ],
})
export class UsersModule {}
```

Great, now you have a versioned User API, and you can access it at the `/v1/users` and `/v2/users` paths.

![User API Versioned](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-versioning.Jpeg?raw=true "User API Versioned")


___

### [Caching](https://docs.nestjs.com/techniques/caching#in-memory-cache) (enabled by default)

By default, the caching is activated globally for all the routes. It uses the nestjs built-in in-memory data store with the default options.
<br>You can configure the cache options by passing the `cacheOptions` in the second parameter of the `DynamicApiModule.forRoot` method.

**Configuration**

```typescript
// app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('...', {
      cacheOptions: {
        ttl: 60, // <- The time to live in milliseconds. This is the maximum amount of time that an item can be in the cache before it is removed.
        max: 100, // <- The maximum number of items that can be stored in the cache.
      },
    }),
    // ...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/techniques/caching" target="_blank">documentation</a> for more details.*

**[Not recommended]** The cache can also be disabled globally with the `useGlobalCache` property set to `false` in the `DynamicApiModule.forRoot` method.

```typescript
// app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot('...', {
      useGlobalCache: false, // <- add this line
    }),
    // ...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Usage**

When you request the `/users` route with the `GET` method, the response will be cached until the cache expires or until the maximum number of items is reached or until a request like `POST`, `PUT`, `PATCH`, or `DELETE` is made on the same route.
<br><br>Let's inspect the behavior in the network tab of our browser
<br>We expected to see a code `200` for the first GET request, a code `304`* for the second GET request, and again a code `200` for the third GET request made after the POST request.

**The 304 Not Modified redirect response code indicates that there is no need to retransmit the requested resources. This is an implicit redirection to a cached resource.*

```text
1. GET /users
```
![First GET request](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-caching-1-GET-first-request.Jpeg?raw=true "First GET request")

```text
2. GET /users
```
![Second GET request](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-caching-2-GET-second-request.Jpeg?raw=true "Second GET request")
```text
3. POST /users
```
![POST request](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-caching-3-POST-request.Jpeg?raw=true "POST request")
```text
4. GET /users
```
![Third GET request](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-caching-4-GET-third-request.Jpeg?raw=true "Third GET request")


___

### [Authentication](https://docs.nestjs.com/security/authorization#integrating-casl) (optional)

An authentication strategy like <a href="https://docs.nestjs.com/security/authentication#jwt-token" target="_blank">JWT</a> is already implemented in the Dynamic API.
All you have to do is to pass the User object and some options to the `useAuth` property of the `DynamicApiModule.forRoot` method.

**Configuration**

Ok, let's update our `User` class to add a `password` field.

```typescript
// user.ts
import { IsEmail } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  email: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  password: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsBoolean()
  @IsOptional()
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

Now, we are going to add the `useAuth` property to the `DynamicApiModule.forRoot` method and pass the `User` object and some options.

```typescript
// app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DynamicApiModule.forRoot('...', {
      // ...,
      useAuth: { // <- add this
        user: {
          entity: User, // <- put here the entity which will represent a User of your API
          loginField: 'email',
          passwordField: 'password',
        },
        jwt: {
          secret: 'my-secret', // <- replace by your own JWT secret in production
        },
      },
    }),
    UsersModule,
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

**Swagger Configuration**

For Swagger users, you must enable the bearer Auth option by setting the `bearerAuth` property to `true` in the enableDynamicAPISwagger method.
This will add the Authorize button in the Swagger UI. This button will allow you to pass the `JWT Token` and unlock the protected routes.

```typescript
// main.ts
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

<a href="https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-authentication-api.md" target="_blank">See more Authentication API screenshots</a>


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

All other routes are protected and require a valid JWT token to be accessed. You can easily make it public by adding the `isPublic` property to the `controllerOptions` object or to the `route` object in the `DynamicApiModule.forFeature` method.
    
```typescript
// users.module.ts
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
// users.module.ts
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

### [Casl](https://docs.nestjs.com/security/authorization#integrating-casl) (only with authentication)

Casl will allow you to condition the actions of your users for each protected route of your APIs.
<br>Authentication is required, you need to enable it or implement your own strategy that adds the User object in the request.

**MongoDB dynamic API** uses the `User` object in the requests to apply the ability predicates defined in the `DynamicApiModule.forFeature`.
<br>You can define them either **in the controller options**,
or **in each route object** declared in the routes property.
<br>*If the ability predicates are specified in 2, those defined in the route will have priority.*

**An ability predicate is an arrow function that takes a subject and the User object (optional) as arguments and returns a boolean.**

Let's create a new Article content and set the ability predicates to the `UpdateOne`, `DeleteOne` and `DeleteMany` routes.

**Configuration**

```typescript
// article.ts
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'mongodb-dynamic-api';

export class Article extends BaseEntity {
  @ApiProperty({ type: Boolean, default: false })
  @Prop({ type: Boolean, default: false })
  isPublished: boolean;

  @ApiProperty()
  @Prop({ type: String })
  authorId: string;
}
```

```typescript
// articles.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from '../users/user';
import { Article } from './article';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Article,
      controllerOptions: {
        path: 'articles',
        abilityPredicates: [ // <- declare the ability predicates in the controller options
          {
            targets: ['DeleteMany', 'DeleteOne'], // <- declare the targets
            predicate: (_: Article, user: User) => user.isAdmin, // <- add the condition
          },
        ],
      },
      routes: [
        { type: 'GetMany', isPublic: true },
        { type: 'GetOne', isPublic: true },
        { type: 'CreateOne' },
        {
          type: 'UpdateOne',
          abilityPredicate: (article: Article, user: User) => // <- declare the ability predicate in the route object
            article.authorId === user.id && !article.isPublished,
        },
      ],
    }),
  ],
})
export class ArticlesModule {}
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user';
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'your-mongodb-uri',
      {
        useAuth: {
          user: {
            entity: User,
            additionalFields: {
              toRegister: ['isAdmin'], // <- here you can set additional fields to display in the register body
              toRequest: ['isAdmin', 'company'], // <- here you can set additional fields to the User object in the request
            },
          },
        },
      },
    ),
    ArticlesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```


**Usage**

First, let's create an admin user with the `POST` method on the `/auth/register` public route.
```text
POST /auth/register

curl -X 'POST' \
  '<your-host>/auth/register' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "admin@test.co",
  "isAdmin": true,
  "password": "admin"
}'
```

Then, we are going to protect the `/auth/register` route by setting the `protectRegister` property to `true` and add a **register ability predicate** in the useAuth Object of the `DynamicApiModule.forRoot` method.
```typescript
// app.module.ts
@Module({
  imports: [
    DynamicApiModule.forRoot(
      'your-mongodb-uri',
      {
        useAuth: {
          // ...,
          protectRegister: true, // <- add this line
          registerAbilityPredicate: (user: User) => user.isAdmin,
        },
      },
    ),
```

Ok, now let's create a non admin user with the `POST` method on the `/auth/register` route.
```text
POST /auth/register

curl -X 'POST' \
  '<your-host>/auth/register' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "toto@test.co",
  "password": "toto"
}'
```
```json
# Server response
{"accessToken":"<toto-jwt-token>"}
```

Next, under toto's account (not admin), we will try to register a new user with the `POST` method on the `/auth/register` route.
<br>The register ability predicate will return `false` and we will receive a `403 Forbidden` error.

```text
POST /auth/register

curl -X 'POST' \
  'http://localhost:5000/auth/register' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "bill@test.co",
  "password": "bill"
}'
```
```json
# Server response
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

The register route is now well protected and only an admin user can create new users.


___

More coming soon...




