[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

___

# [Validation](https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe)
<br>`function enableDynamicAPIValidation(app: INestApplication, options?: ValidationPipeOptions): void`

**Configuration**

```typescript
// src/main.ts
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
// src/users/users.module.ts
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
// src/users/user.ts
import { IsEmail } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty()
  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;

  @ApiPropertyOptional()
  @Prop({ type: String })
  company?: string;
}
```

Ok, now if you try to create a new user with an invalid email, you will get a `400 Bad Request` error.

![User API Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/images/dynamic-api-validation.Jpeg?raw=true "User API Validation")

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)


<br>
<br>
<br>