[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Versioning

Enable API versioning easily.

## Quick Setup

```typescript
// src/main.ts
import { enableDynamicAPIVersioning } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIVersioning(app); // Enable versioning
  await app.listen(3000);
}
```

- By default, URI versioning is used. You can pass options to customize.
- See [NestJS versioning docs](https://docs.nestjs.com/techniques/versioning) for more.

## Usage Example

Set the `version` property at the controller or route level:

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: { version: '2' },
  routes: [
    { type: 'CreateOne', version: '2' },
  ],
});
```

Route-level version overrides controller-level version.
