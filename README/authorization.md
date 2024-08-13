[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **Authorization**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# [Authorization]() ([Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md) required)

**Ability predicates** will allow you to condition the actions of your users for each protected route of your APIs.
<br>Authentication is required, you need to enable it or implement your own strategy that adds the User object in the request.

**MongoDB dynamic API** uses the `User` object in the requests to apply the ability predicates defined in the `DynamicApiModule.forFeature`.
<br>You can define them either **in the controller options**,
or **in each route object** declared in the routes property.
<br>*If the ability predicates are specified in 2, those defined in the route will have priority.*

## Register
#### Ability predicate: `(user: User) => boolean;`

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
          },
          register: {
            additionalFields: [{ name: 'isAdmin', required: true }], // <- add the isAdmin field to the register body
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
  "password": "admin",
  "isAdmin": true
}'
```
```json
# Server response
{"accessToken":"<admin-jwt-token>"}
```

Then, in the **register configuration**, we are going to protect the `/auth/register` route by setting
the `abilityPredicate` property with a **special register ability predicate** that takes
**only the user** as argument and returns `true` if the user is an admin.

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
  "password": "toto",
  "isAdmin": false
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
  '<your-host>/auth/register' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "user@test.co",
  "password": "user",
  "isAdmin": false
}'
```
```json
# Server response
{
  "message": "Access denied",
  "error": "Forbidden",
  "statusCode": 403
}
```

The register route is now well protected and only an admin user can create new users.

## Articles
#### Ability predicate: `(article: Article, user: User) => boolean;`

We are going to add a new content `Article` and protect the get one, update and delete routes with
ability predicates.
<br>We will also add custom DTOs:
- to the `CreateOne` route to define the fields required to create an article.
- to the `UpdateOne` route to remove the possibility to update the `authorId` field when editing an article.

**Configuration**

```typescript
// src/articles/article.ts
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'mongodb-dynamic-api';

@Schema()
export class Article extends BaseEntity {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  title: string;

  @ApiProperty({ type: Boolean, default: false })
  @Prop({ type: Boolean, default: false })
  isPublished: boolean;

  @ApiProperty()
  @Prop({ type: String, required: true })
  authorId: string;
}
```

```typescript
// src/articles/create-one-article.dto.ts
import { PickType } from '@nestjs/swagger';
import { Article } from './article';

export class CreateOneArticleDto extends PickType(Article, [
  'title',
  'authorId',
]) {}
```

```typescript
// src/articles/update-one-article.dto.ts
import { PartialType, PickType } from '@nestjs/swagger';
import { Article } from './article';

export class UpdateOneArticleDto extends PartialType(
  PickType(Article, ['title', 'isPublished']),
) {}
```

*`PartialType` and `PickType` are decorators from the `@nestjs/swagger` package.
They allow you to create a new `DTO` by picking (`PickType`) only the fields you want from the
original DTO and make them optional (`PartialType`).
<br>See <strong>nestjs</strong> <a href="https://docs.nestjs.com/openapi/mapped-types" target="_blank">documentation</a> for more details.*

We will allow only the author to get, update or delete the article if not published yet
and only the admins to delete articles even if they are published.

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
            predicate: (article: Article, user: User) =>
              user.isAdmin ||
              (article.authorId === user.id && !article.isPublished), // <- add the condition
          },
        ],
      },
      routes: [
        { type: 'GetMany', isPublic: true }, // <- declare the non protected route by setting isPublic to true
        {
          type: 'GetOne',
          abilityPredicate: (article: Article, user: User) =>
            article.authorId === user.id || article.isPublished,
        },
        {
          type: 'CreateOne', // <- protected by default, needs the user to be authenticated to access it
          dTOs: { body: CreateOneArticleDto }, // <- add yours dto here
        },
        {
          type: 'UpdateOne',
          abilityPredicate: (article: Article, user: User) => // <- declare the ability predicate in the route object
            article.authorId === user.id && !article.isPublished,
          dTOs: { body: UpdateOneArticleDto }, // <- add yours dto here
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
          },
          register: {
            additionalFields: [{ name: 'isAdmin', required: true }],
            abilityPredicate: (user: User) => user.isAdmin,
          },
        },
      },
    ),
    ArticlesModule, // <- add the new module here
  ],
})
export class AppModule {}
```

Ok now we have 2 APIs, **Auth** and **Articles**, with routes strongly protected by **ability predicates**.

- **Auth**: Account, Login and Register
- **Articles**: GetMany, GetOne, CreateOne, UpdateOne, DeleteOne and DeleteMany

___

**CreateOne test**
<br>*First of all, let's try to create an article with the `POST` method on the `/articles` route without being authenticated.*

```shell
# POST /articles

curl -X 'POST' \
  '<your-host>/articles' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "title": "My first article",
  "authorId": "<author-id>"
}'
```
```json
# Server response
{ "message": "Unauthorized", "statusCode": 401 }
```

*Ok, now logged in as toto, we will retry to create the article.*

```shell
# POST /articles

curl -X 'POST' \
  '<your-host>/articles' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' \ # <- replace by the toto jwt token
  -H 'Content-Type: application/json' \
  -d '{
  "title": "My first article",
  "authorId": "<toto-id>" # <- replace by the toto id
}'
```
```json
# Server response
{
  "title": "My first article",
  "isPublished": false,
  "authorId": "<toto-id>",
  "createdAt": "article-created-at",
  "updatedAt": "article-updated-at",
  "id": "<article-id>"
}
```

**GetMany test**
<br>*Next, we will try to get all the articles with the `GET` method on the `/articles` route without being authenticated.*

```shell
# GET /articles

curl -X 'GET' \
  '<your-host>/articles' \
  -H 'accept: application/json'
```
```json
# Server response
[
  {
    "id": "<article-id>",
    "title": "My first article",
    "isPublished": false,
    "authorId": "<toto-id>",
    "createdAt": "article-created-at",
    "updatedAt": "article-updated-at"
  }
]
```

**GetOne test**
<br>*Now, we will try to get the article with the `GET` method on the `/articles/:id` route without being authenticated.*

```shell
# GET /articles/:id

curl -X 'GET' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application/json'
```
```json
# Server response
{ "message": "Unauthorized", "statusCode": 401 }
```

*Then, logged in as toto, we will retry to get the article.*

```shell 
# GET /articles/:id

curl -X 'GET' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' # <- replace by the toto jwt token
```
```json
# Server response
{
  "id": "<article-id>",
  "title": "My first article",
  "isPublished": false,
  "authorId": "<toto-id>",
  "createdAt": "article-created-at",
  "updatedAt": "article-updated-at"
}
```

*Finally, logged in as admin, we will retry to get the article.*

```shell
# GET /articles/:id

curl -X 'GET' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application
  -H 'Authorization: Bearer <admin-jwt-token>' # <- replace by the admin jwt token
```
```json
# Server response
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

*Ok, the `GetOne` route is well protected and only the author can access the article if not published yet.*

**UpdateOne test**
<br>*Next, logged in as admin, we will try to update the article with the `PUT` method on the `/articles/:id` route.*

```shell
# PUT /articles/:id

curl -X 'PATCH' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <admin-jwt-token>' \ # <- replace by the admin jwt token
  -H 'Content-Type: application/json' \
  -d '{
  "isPublished": true
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

*Let's retry, logged in as toto, to update the article.*

```shell
# PUT /articles/:id

curl -X 'PATCH' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' \ # <- replace by the toto jwt token
  -H 'Content-Type: application/json' \
  -d '{
  "isPublished": true
}''
```
```json
# Server response
{
  "id": "<article-id>",
  "title": "My first article",
  "isPublished": true,
  "authorId": "<toto-id>",
  "createdAt": "article-created-at",
  "updatedAt": "new-article-updated-at"
}
```

**GetOne (admin) test**
<br>*Finally, logged in as admin, we will retry to get the published article.*

```shell
# GET /articles/:id

curl -X 'GET' \
  '<your-host>/articles/<article-id>' \ # <- replace by the article id
  -H 'accept: application
    -H 'Authorization
    -H 'Authorization: Bearer <admin-jwt-token>' # <- replace by the admin jwt token
```
```json
# Server response
{
  "id": "<article-id>",
  "title": "My first article",
  "isPublished": true,
  "authorId": "<toto-id>",
  "createdAt": "article-created-at",
  "updatedAt": "new-article-updated-at"
}
```
*Great, the published article is now accessible to the admin.*

**DeleteOne test**
<br>*Here, logged in as toto, we will try to delete the article with the `DELETE` method on the `/articles/:id` route.*

```shell
# DELETE /articles/:id

curl -X 'DELETE' \
  '<your-host>/articles/<article-id>' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <toto-jwt-token>' # <- replace by the toto jwt token
```
```json
# Server response
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

*Finally, logged in as admin, we will retry to delete the article.*

```shell
# DELETE /articles/:id

curl -X 'DELETE' \
  '<your-host>/articles/<article-id>' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <admin-jwt-token>' # <- replace by the admin jwt token
```
```json
# Server response
{ "deletedCount": 1 }
```

*As expected, the article is well deleted.*

**DeleteMany test**
<br>*Same behavior as the `DeleteOne` route, but for multiple articles.*

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **Authorization**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>