[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **Authorization**

___

# [Casl](https://docs.nestjs.com/security/authorization#integrating-casl) ([Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md) required)

Casl will allow you to condition the actions of your users for each protected route of your APIs.
<br>Authentication is required, you need to enable it or implement your own strategy that adds the User object in the request.

**MongoDB dynamic API** uses the `User` object in the requests to apply the ability predicates defined in the `DynamicApiModule.forFeature`.
<br>You can define them either **in the controller options**,
or **in each route object** declared in the routes property.
<br>*If the ability predicates are specified in 2, those defined in the route will have priority.*

## Register

By default, the `User` object is added to the request by the `useAuth` configuration.
It contains the `id` and `email` fields of the authenticated user.
We will add the `isAdmin` field to the `User` object by adding it in the `requestAdditionalFields` property.
<br>We also need to add the `isAdmin` field in the `additionalFields` property of the `register` object
to allow the creation of admin users.

Ok, let's see how to protect the `/auth/register` and let only the admin users create new users.

**Configuration**
```typescript
// src/app.module.ts
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
            requestAdditionalFields: ['isAdmin'], // <- add the isAdmin field to the request User object
            register: {
              additionalFields: [{ name: 'isAdmin', required: true }], // <- add the isAdmin field to the register body
            },
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

**Usage**

First, let's create an admin user with the `POST` method on the `/auth/register` public route.
```text
# POST /auth/register

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
```json
# Server response
{"accessToken":"<admin-jwt-token>"}
```

Then, in the **register configuration**, we are going to protect the `/auth/register` route by setting the `protected` property to `true` and add a **special register ability predicate** that takes **only the user** as argument and returns `true` if the user is an admin.

```typescript
// src/app.module.ts
@Module({
  imports: [
    DynamicApiModule.forRoot(
      'your-mongodb-uri',
      {
        useAuth: {
          // ...,
          register: {
            additionalFields: [{ name: 'isAdmin', required: true }],
            abilityPredicate: (user: User) => user.isAdmin, // <- only admin users can create new users
            protected: true, // <- needs to be authenticated to access the route
          },
        },
      },
    ),
  ],
  // ...
})
export class AppModule {}
```

Ok, now let's create a non admin user with the `POST` method on the `/auth/register` route.
```text
# POST /auth/register

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
# POST /auth/register

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

## Articles

We are going to add a new content `Article` and protect the get one, update and delete routes with ability predicates.

**Configuration**

```typescript
// src/articles/article.ts
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

We will allow the admins and author to get the article, only the author to update it if not published yet and only the admins to delete articles.

Let's add our **ability predicates** to the `GetOne`, `UpdateOne`, `DeleteOne` and `DeleteMany` routes.
<br>*The ability predicate is an arrow function that takes the **Content (the entity)** and the **User** request object (optional) as arguments and returns a boolean.*
<br>`(entity: Entity, user?: User) => boolean;`

```typescript
// src/articles/articles.module.ts
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
            targets: ['DeleteMany', 'DeleteOne'], // <- declare the targeted routes
            predicate: (_: Article, user: User) => user.isAdmin, // <- add the condition
          },
        ],
      },
      routes: [
        { type: 'GetMany', isPublic: true }, // <- declare the non protected route by setting isPublic to true
        {
          type: 'GetOne',
          abilityPredicate: (article: Article, user: User) =>
            article.authorId === user.id || user.isAdmin || article.isPublished,
        },
        { type: 'CreateOne' }, // <- protected by default, needs the user to be authenticated to access it
        {
          type: 'UpdateOne',
          abilityPredicate: (article: Article, user: User) => // <- declare the ability predicate in the route object
            article.authorId === user.id && !article.isPublished,
        },
        { type: 'DeleteMany' }, // <- protected by default and by the ability predicate set in the controller options
        { type: 'DeleteOne' },
      ],
    }),
  ],
})
export class ArticlesModule {}
```

Last, don't forget to add Article to the `DynamicApiModule.forFeature` in the `imports` property of the `AppModule`.

```typescript
// src/app.module.ts
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
            requestAdditionalFields: ['isAdmin'],
            register: {
              additionalFields: [{ name: 'isAdmin', required: true }],
            },
          },
        },
      },
    ),
    ArticlesModule, // <- add the new module here
  ],
  // ...
})
export class AppModule {}
```

Ok now we have 2 APIs, **Auth** and **Articles**, with routes strongly protected by **ability predicates**.

- **Auth**: Account, Login and Register
- **Articles**: GetMany, GetOne, CreateOne, UpdateOne, DeleteOne and DeleteMany

___

**CreateOne test**

First of all, let's try to create an article with the `POST` method on the `/articles` route without being authenticated.
```text
# POST /articles
```
```json
# Server response
```

Ok, now logged in as toto, we will retry to create the article.

```text
# POST /articles
```
```json
# Server response
```

**GetMany test**

Next, we will try to get all the articles with the `GET` method on the `/articles` route.
```text
# GET /articles
```
```json
# Server response
```

**GetOne test**

Next, not logged in, we will try to get the article with the `GET` method on the `/articles/:id` route.
```text
# GET /articles/:id
```
```json
# Server response
```

Then, logged in as toto, we will retry to get the article.
```text 
# GET /articles/:id
```
```json
# Server response
```

Finally, logged in as admin, we will retry to get the article.
```text
# GET /articles/:id
```
```json
# Server response
```

**UpdateOne test**

Next, logged in as admin, we will try to update the article with the `PUT` method on the `/articles/:id` route.
```text
# PUT /articles/:id
```
```json
# Server response
```

Let's retry, logged in as toto, to update the article.
```text
# PUT /articles/:id
```
```json
# Server response
```

**DeleteOne test**

Here, logged in as toto, we will try to delete the article with the `DELETE` method on the `/articles/:id` route.
```text
# DELETE /articles/:id
```
```json
# Server response
```

Finally, logged in as admin, we will retry to delete the article.
```text
# DELETE /articles/:id
```
```json
# Server response
```

**DeleteMany test**

Same behavior as the `DeleteOne` route, but for multiple articles.

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **Authorization**


<br>
<br>
<br>