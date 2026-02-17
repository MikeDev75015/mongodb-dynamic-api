[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Swagger UI

Enable Swagger documentation for your API with a single function.

## Quick Setup

```typescript
// src/main.ts
import { enableDynamicAPISwagger } from 'mongodb-dynamic-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPISwagger(app); // Enable Swagger UI
  await app.listen(3000);
}
```

- Optionally, pass options to customize the documentation.
- See [NestJS Swagger docs](https://docs.nestjs.com/openapi/introduction#document-options) for more.

## Usage Tips
- Use `@ApiProperty` and `@ApiPropertyOptional` on your class properties for better docs.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty()
  @Prop({ required: true })
  name: string;

  @ApiProperty()
  @Prop({ required: true })
  email: string;

  @ApiPropertyOptional()
  @Prop()
  company?: string;
}
```

- Visit `/dynamic-api` to view the generated API docs.
