[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Validation

Enable global validation for your API with a single function.

## Quick Setup

```typescript
// src/main.ts
import { enableDynamicAPIValidation } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIValidation(app); // Enable global validation
  await app.listen(3000);
}
```

- You can also set validation options in `DynamicApiModule.forFeature` (controller or route level).

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    validationPipeOptions: {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    },
  },
  routes: [
    {
      type: 'DuplicateOne',
      validationPipeOptions: { transform: true },
    },
  ],
});
```

See the [NestJS validation docs](https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe) for more.
