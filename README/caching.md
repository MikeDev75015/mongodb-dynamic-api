[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **Caching**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# [Caching](https://docs.nestjs.com/techniques/caching#in-memory-cache) (enabled by default)

By default, the caching is activated globally for all the routes. It uses the nestjs built-in in-memory data store with the default options.
<br>You can configure the cache options by passing the `cacheOptions` in the second parameter of the `DynamicApiModule.forRoot` method.

**Configuration**

```typescript
// src/app.module.ts
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
// src/app.module.ts
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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **Caching**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>