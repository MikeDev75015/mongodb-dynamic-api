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
- We use the `@Schema` and `@Prop` decorators from the `@nestjs/mongoose` package to define our MongoDB model. 
- You must extend the `BaseEntity` (or `SoftDeletableEntity`) class from the `mongodb-dynamic-api` package **for all your collection models**.
- Just create a new file `user.ts` and add the following code.

```typescript
// users/user.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
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

___
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
  @Prop({ type: String })
  name: string;
  
  @ApiProperty() // <- add this line
  @Prop({ type: String })
  email: string;

  @ApiPropertyOptional() // <- add this line
  @Prop({ type: String, required: false })
  company?: string;
}
```

go to the swagger API path (default to `/dynamic-api`) and you will see the auto generated API

![User API](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-user-full.Jpeg?raw=true "User API")

<a href="https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger.md" target="_blank">See more User API screenshots</a>

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
  @Prop({ type: String })
  name: string;

  @ApiProperty()
  @IsEmail()
  @Prop({ type: String })
  email: string;

  @ApiPropertyOptional()
  @Prop({ type: String, required: false })
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

> When you request the `/users` route with the `GET` method, the response will be cached until the cache expires or until the maximum number of items is reached or until a request like `POST`, `PUT`, `PATCH`, or `DELETE` is made on the same route.
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

More coming soon...




