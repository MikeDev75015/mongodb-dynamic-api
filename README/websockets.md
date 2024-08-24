[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **WebSockets**

___

# [WebSockets](https://docs.nestjs.com/websockets/gateways#installation)
`function enableDynamicAPIWebSockets(app: INestApplication, maxListeners?: number): void`

The `enableDynamicAPIWebSockets` function will add the possibility to use WebSockets in your application.
<br>By default, the maximum number of listeners is set to `10`.
<br>You can change this value by passing a second parameter to the function.
<br>*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/websockets/gateways" target="_blank">documentation</a> for more details.*

**Configuration**

```typescript
// src/main.ts
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  enableDynamicAPIWebSockets(app); // <- add this line in your main.ts file

  await app.listen(3000);
}
```

**Usage**

`webSocket: GatewayMetadata | boolean;`

You can enable WebSockets in your application at global,
module or route level by setting the `webSocket` property to `true`
or by passing a [GatewayMetadata](https://github.com/nestjs/nest/blob/master/packages/websockets/interfaces/gateway-metadata.interface.ts) object.

*If the webSocket is specified at the global level, it will be applied to all modules and routes,
at the module level, it will be applied to all routes in the module,
and at the route level, it will be applied only to the route.*

#### Global level
```typescript
// src/app.module.ts
@Module({
  imports: [
    DynamicApiModule.forRoot({
      ...,
      webSocket: true, // <- add this line
    }),
    ],
})
export class AppModule {}
```

#### Module level
```typescript
// src/feature/feature.module.ts
@Module({
  imports: [
    DynamicApiModule.forFeature({
      ...,
      webSocket: { namespace: '/v1' }, // <- add this line, the socket url will be your-api-url/v1
    }),
  ],
})
export class FeatureModule {}
```

#### Route level
```typescript
// src/feature/feature.module.ts

@Module({
  imports: [
    DynamicApiModule.forFeature({
      ...,
      controllerOptions: {
        path: 'features',
      },
      routes: [
        { type: 'GetMany', webSocket: true }, // <- add this line, event name will be 'features-get-many'
        {
          type: 'CreateOne',
          webSocket: true,
          eventName: 'custom-event-name', // <- add this line, event name will be 'custom-event-name'
        },
      ],
    }),
  ],
})
export class FeatureModule {}
```

**Events**

- For authentication, event names are :
  `auth-register`, `auth-login`, `auth-get-account`, `auth-update-account`, `auth-reset-password`, `auth-change-password`.


- For each feature they are automatically generated based on the route type, the entity name and the sub path if specified.
  <br>For example, the event name for a `GetMany` route of the `Feature` entity will be `get-many-features`.
  <br>The event name for a `GetMany` route of the `Feature` entity with `sub` as sub path will be `get-many-sub-features`.


- However, when your application starts, you will see the list of all the events generated for each feature in the console.
  ![Websockets events log](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-websocket-events-log.png?raw=true "Websockets events log")


- You can also specify a custom event name by passing a string to the `eventName` property of the route object.
  <br>For example, `{ type: 'GetMany', eventName: 'custom-event-name' }`.


___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **WebSockets**


<br>
<br>
<br>