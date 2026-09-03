[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Schematics

`mongodb-dynamic-api` ships a Nest CLI schematics collection: scaffold an entity + its `forFeature` module in one command instead of writing both by hand.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [What Gets Generated](#what-gets-generated)
- [Options](#options)
- [Registering the Module](#registering-the-module)
- [Related Documentation](#related-documentation)

---

## Quick Start

```bash
nest generate --collection mongodb-dynamic-api resource user
# or, with the shorter aliases:
nest g -c mongodb-dynamic-api res user
```

This requires `@nestjs/cli` (`nest`) — already a prerequisite of any Nest project — nothing extra to install.

---

## What Gets Generated

`nest g -c mongodb-dynamic-api res user` creates, under `src/user/` by default:

```typescript
// src/user/user.entity.ts
import { Prop } from '@nestjs/mongoose';
import { BaseEntity, DynamicApiSchema } from 'mongodb-dynamic-api';

@DynamicApiSchema({ collection: 'user' })
export class User extends BaseEntity {
  // TODO: declare your entity's fields here, e.g.:
  // @Prop({ type: String, required: true })
  // title: string;
}
```

```typescript
// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { User } from './user.entity';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: User,
      controllerOptions: { path: 'user' },
    }),
  ],
})
export class UserModule {}
```

From there, add your `@Prop()` fields to the entity and fine-tune `routes`/`controllerOptions` on the module exactly as you would for any other [Route Config](./route-config.md) — the generated module is a plain, editable starting point, not generated-and-locked code.

---

## Options

| Option | Alias | Type | Default | Description |
|---|:---:|:---:|:---:|---|
| `name` | — | `string` | *(required)* | The resource name (e.g. `user`, `blog-post`, `blogPost` — all normalized). |
| `--path` | — | `string` | `src` | Directory the files are generated under. |
| `--flat` | — | `boolean` | `false` | Skip the `<dasherized-name>/` subdirectory — write straight into `--path`. |
| `--soft-delete` | `softDelete` | `boolean` | `false` | Extend `SoftDeletableEntity` instead of `BaseEntity`. |

```bash
nest g -c mongodb-dynamic-api res blogPost --path=src/modules --flat --soft-delete
# → src/modules/blog-post.entity.ts, src/modules/blog-post.module.ts
# → class BlogPost extends SoftDeletableEntity
```

> The resource name is normalized the same way regardless of the casing you type it in — `user`, `User`, `user-profile`, `userProfile` and `UserProfile` all produce the expected `kebab-case` file/collection names and `PascalCase` class names.

---

## Registering the Module

The schematic only generates the two files — it does **not** edit `app.module.ts` for you. Import the generated module yourself:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    DynamicApiModule.forRoot('mongodb://localhost:27017/myapp'),
    UserModule,
  ],
})
export class AppModule {}
```

---

## Related Documentation

- 🗂️ **[Route Config](./route-config.md)** — every option available on the generated module's `routes`/`controllerOptions`
- 🗂️ **[Entities](./entities.md)** — `BaseEntity`, `SoftDeletableEntity`, and what they provide

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)
