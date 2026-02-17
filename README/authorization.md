[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Authorization (Ability Predicates)

Authorization restricts access to routes based on user rights. Use ability predicates for dynamic access control.

## Quick Example: Protect Registration

```typescript
// src/app.module.ts
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './users/user';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb-uri', {
      useAuth: {
        user: {
          entity: User,
          requestAdditionalFields: ['isAdmin'],
        },
        register: {
          additionalFields: [{ name: 'isAdmin', required: true }],
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Define an Access Rule

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    abilityPredicate: (user) => user.isAdmin === true,
  },
});
```

- Place the rule in `controllerOptions` or per route.
- Route-level rules override controller-level rules.

## Best Practices
- Keep predicates simple and testable.
- Only add necessary fields to the user object.

See the [NestJS authorization docs](https://docs.nestjs.com/security/authorization) for more.
