[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **Versioning**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# [Versioning](https://docs.nestjs.com/techniques/versioning)
`function enableDynamicAPIVersioning(app: INestApplication, options?: VersioningOptions): void`

The `enableDynamicAPIVersioning` function will automatically add versioning to the API.
<br>By default, it will use the <strong>URI versioning type</strong>.
<br>This method can be called with a second <strong>optional parameter</strong> to specify custom options.
<br>*See <strong>nestjs</strong> <a href="https://docs.nestjs.com/techniques/versioning" target="_blank">documentation</a> for more details.*

**Configuration**

```typescript
// src/main.ts
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
// src/users/create-one-user-v2.dto.ts
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
// src/users/user-v2.presenter.ts
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
// src/users/users.module.ts
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

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **Versioning**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>