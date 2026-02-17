[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Authentication (JWT)

JWT authentication is built-in. Just configure the `useAuth` property in `DynamicApiModule.forRoot`.

## Minimal Example

```typescript
// src/users/user.ts
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;
}
```

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb-uri', {
      useAuth: {
        user: { entity: User },
      },
    }),
  ],
})
export class AppModule {}
```

- By default, `email` and `password` fields are required.
- To customize, use `loginField` and `passwordField` in the `user` config.

## Best Practices
- Always hash passwords (e.g., bcrypt).
- Use HTTPS in production.
- Consider token renewal strategies.

See the [NestJS JWT documentation](https://docs.nestjs.com/security/authentication#jwt-token) for advanced options.
