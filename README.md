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

- Add DynamicApiModule to your app.module.ts and pass the MongoDB connection string to the `forRoot` method
```typescript
@Module({
  imports: [
    // ...
    DynamicApiModule.forRoot(
      // <- pass the MongoDB connection string here
    ),
    // ...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- Ok, now let's add our first content. This content will be a simple `User` with a `name` and an `email` field.
```typescript
// user.ts
@Schema({ collection: 'users' })
export class User extends BaseEntity { // <- you must extend BaseEntity
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  email: string;
}
```
```typescript
// users.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({ // <- use the forFeature method to add the User content
      entity: User,
      controllerOptions: {
        path: 'users',
      },
    }),
  ],
})
export class UsersModule {}
```
```typescript
// app.module.ts
@Module({
  imports: [
    // ...
    DynamicApiModule.forRoot('...'),
    UsersModule, // <- add the module to the imports after the DynamicApiModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**That's all !** *You now have a fully functional CRUD API for the `User` content at the `/users` path.*

___
### [Swagger]() (optional but recommended)
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPISwagger(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```
The `enableDynamicAPISwagger` function will automatically build the swagger documentation.
This method can be called with optional parameters to specify more documentation options.

Do not forget to add the `@ApiProperty` decorator to your entity properties to have a better swagger documentation.
```typescript
// user.ts
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty() // <- add this line
  @Prop({ type: String })
  name: string;
  
  @ApiProperty() // <- add this line
  @Prop({ type: String })
  email: string;
}
```

go to the swagger API path (default to `/openapi`) and you will see the auto generated API


![User API](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-user-full.Jpeg?raw=true "User API")

[more screenshots](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger.md)

___
### Versioning (optional)
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPIVersioning(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```
The `enableDynamicAPIVersioning` function will automatically add versioning to the API. By default it will use the URI versioning type.
This method can be called with a second optional parameter to specify more options.
