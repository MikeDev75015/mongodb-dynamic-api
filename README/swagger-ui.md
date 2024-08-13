[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**Swagger UI**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# [Swagger UI](https://docs.nestjs.com/openapi/introduction#document-options)
`function enableDynamicAPISwagger(app: INestApplication, options?: DynamicAPISwaggerOptions): void`

**Configuration**

```typescript
// src/main.ts
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

- Add the `@ApiProperty` | `@ApiPropertyOptional` decorators to your class properties to have a better swagger documentation.
<br>Let's add an optional company field to the `User` class.

```typescript
// src/users/user.ts
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

- Go to the swagger API path (default to `/dynamic-api`) and you will see the auto generated API

![User API](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-user-full.Jpeg?raw=true "User API")

#### Get many users
![Get many users](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-get-many.Jpeg?raw=true "Get many users")

#### Get one user
![Get one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-get-one.Jpeg?raw=true "Get one user")

#### Create many users
![Create many users](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-create-many.Jpeg?raw=true "Create many users")

#### Create one user
![Create one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-create-one.Jpeg?raw=true "Create one user")

#### Update many user
![Update many user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-update-many.Jpeg?raw=true "Update many user")

#### Update one user
![Update one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-update-one.Jpeg?raw=true "Update one user")

#### Delete many user
![Delete many user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-delete-many.Jpeg?raw=true "Delete many user")

#### Delete one user
![Delete one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-delete-one.Jpeg?raw=true "Delete one user")

#### Replace one user
![Replace one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-replace-one.Jpeg?raw=true "Replace one user")

#### Duplicate many user
![Duplicate many user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-duplicate-many.Jpeg?raw=true "Duplicate many user")

#### Duplicate one user
![Duplicate one user](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-duplicate-one.Jpeg?raw=true "Duplicate one user")

#### Generated Schemas
![Generated Schemas](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-user-schemas.Jpeg?raw=true "Generated Schemas")

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**Swagger UI**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>