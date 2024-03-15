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

## mongodb-dynamic-api <img src="https://pbs.twimg.com/media/EDoWJbUXYAArclg.png" width="24" height="24" />
```text
npm install --save mongodb-dynamic-api
```

---

<div style="text-align: center; width: 100%;">

# Dynamic API Module

</div>


<p style="text-align: justify; width: 100%;font-size: 15px;">

In summary, DynamicApiModule is a flexible and configurable module using NestJS 10 that provides dynamic API functionality.
<br>It must be set up at the root level with global settings and then configured for individual features.
<br>It has several optional features such as
Swagger UI,
Authentication (JWT),
Authorization (Casl),
Validation (Class Validator)
and Caching (cache-manager).

</p>

___

### HOW TO ENJOY IT

- Start a new [nest](https://docs.nestjs.com/) project with **typescript** (use the `--strict` option)
```text
nest new --strict your-project-name
```

- Go to your new project root and install the [mongodb-dynamic-api](https://www.npmjs.com/package/mongodb-dynamic-api) package
```text
npm i -S mongodb-dynamic-api
```
**Basic Configuration**

- Add `DynamicApiModule.forRoot` to your `app.module.ts` and pass your **MongoDB connection string** to the method.

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb-uri', // <- replace by your own MongoDB connection string
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
- We use the `@Schema` and `@Prop` decorators from the <a href="https://docs.nestjs.com/techniques/mongodb#model-injection" target="_blank">@nestjs/mongoose</a> package to define our MongoDB model.

- You must extend the `BaseEntity` class from the `mongodb-dynamic-api` package **for all your collection models**.
- Just create a new file `user.ts` and add the following code.

```typescript
// src/users/user.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';

@Schema({ collection: 'users' })
export class User extends BaseEntity { // <- extends BaseEntity
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}
```

- Then we will use the `DynamicApiModule.forFeature` method to add the `User` API to our application.
- We pass the `User` class to the `entity` property and specify the path `users` to the `controllerOptions` property.
- Create a new file `users.module.ts` and add the following code.

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
    }),
  ],
})
export class UsersModule {}
```

- Last step, add the `UsersModule` to the **imports** in the `app.module.ts` after the `DynamicApiModule.forRoot` method.

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DynamicApiModule.forRoot(
      'mongodb-uri', // <- replace by your own MongoDB connection string
    ),
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
| GET **/users**               <br>*Get many*       |                       x                        |      x       |        x        |
| GET **/users/:id**           <br>*Get one*        |                       x                        | `id: string` |        x        |
| POST **/users/many**         <br>*Create many*    | `{ list: [{ name: string; email: string; }] }` |      x       |        x        |
| POST **/users**              <br>*Create one*     |       `{ name: string; email: string; }`       |      x       |        x        |
| PUT **/users/:id**           <br>*Replace one*    |       `{ name: string; email: string; }`       | `id: string` |        x        |
| PATCH **/users**             <br>*Update many*    |      `{ name?: string; email?: string; }`      |      x       | `ids: string[]` |
| PATCH **/users/:id**         <br>*Update one*     |      `{ name?: string; email?: string; }`      | `id: string` |        x        |
| DELETE **/users**            <br>*Delete many*    |                       x                        |      x       | `ids: string[]` |
| DELETE **/users/:id**        <br>*Delete one*     |                       x                        | `id: string` |        x        |
| POST **/users/duplicate**    <br>*Duplicate many* |      `{ name?: string; email?: string; }`      |      x       | `ids: string[]` |
| POST **/users/duplicate/:id**<br>*Duplicate one*  |      `{ name?: string; email?: string; }`      | `id: string` |        x        |

___

Go further with optional features like **Swagger UI**, **Validation**, **Caching**, **Authentication** and **Authorization**.

- **[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
- **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)** with **Class Validator**
- **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)** with **cache-manager**
- **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)** with **JWT**
- **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)** with **Casl**




<br>
<br>
<br>

