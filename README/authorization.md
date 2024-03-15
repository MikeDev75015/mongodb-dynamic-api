[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

___

# [Casl](https://docs.nestjs.com/security/authorization#integrating-casl) ([Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md) required)

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
// src/app.module.ts
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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)


<br>
<br>
<br>