[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Testing

`createDynamicApiTestingApp` builds and initializes a fully-wired Nest testing application, backed by an **in-memory MongoDB** — no Docker container or external database needed to write e2e tests against your `DynamicApiModule`-based API.

It lives at a separate entry point, `mongodb-dynamic-api/testing`, so the (optional) testing-only dependencies it needs never load as part of your production import graph.

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Options](#options)
- [Using a Real MongoDB Instead](#using-a-real-mongodb-instead)
- [Related Documentation](#related-documentation)

---

## Installation

```bash
npm install --save-dev mongodb-memory-server
```

Only needed if you don't pass your own `uri` (see [Using a Real MongoDB Instead](#using-a-real-mongodb-instead)). Omitting it while also omitting `uri` throws a clear, actionable error instead of an opaque module-not-found one.

---

## Quick Start

```typescript
// users.e2e-spec.ts
import { createDynamicApiTestingApp } from 'mongodb-dynamic-api/testing';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import * as request from 'supertest';
import { User } from './user.entity';

describe('Users (e2e)', () => {
  let testingApp: Awaited<ReturnType<typeof createDynamicApiTestingApp>>;

  beforeAll(async () => {
    testingApp = await createDynamicApiTestingApp({
      imports: [
        DynamicApiModule.forFeature({
          entity: User,
          controllerOptions: { path: 'users' },
        }),
      ],
    });
  });

  afterAll(() => testingApp.close());

  it('POST /users', async () => {
    const { body } = await request(testingApp.app.getHttpServer())
      .post('/users')
      .send({ email: 'a@test.co' })
      .expect(201);

    expect(body).toMatchObject({ email: 'a@test.co' });
  });
});
```

`testingApp.app` is a fully initialized `INestApplication` — pass `testingApp.app.getHttpServer()` straight to `supertest`, exactly like you would with a manually built `Test.createTestingModule(...)`.

---

## Options

| Option | Default | Description |
|---|---|---|
| `uri` | *(none — starts an in-memory MongoDB)* | Pass your own MongoDB URI to skip the in-memory server entirely (e.g. a real instance already running in CI). |
| `forRootOptions` | `{}` | Forwarded as-is to `DynamicApiModule.forRoot()` — `useAuth`, `routesConfig`, `webSocket`, etc. |
| `imports` | `[]` | Additional module imports — typically your `DynamicApiModule.forFeature(...)` calls for the entities under test. |
| `providers` | `[]` | Additional providers for the testing module. |
| `controllers` | `[]` | Additional controllers for the testing module. |

`createDynamicApiTestingApp()` returns `{ app, uri, close() }` — always call `close()` in `afterAll`/`afterEach`; it closes the Nest app and, if one was started, stops the in-memory MongoDB too.

---

## Using a Real MongoDB Instead

Pass your own `uri` — useful when your CI already runs a real MongoDB (e.g. a Docker service container) and you'd rather reuse it than start a second, in-memory one:

```typescript
testingApp = await createDynamicApiTestingApp({
  uri: process.env.MONGO_DB_URL,
  imports: [/* ... */],
});
```

`mongodb-memory-server` is never touched in this case — it doesn't need to be installed.

---

## Related Documentation

- 🩺 **[Health Check](./health-check.md)** — the other standalone, "wire it in and go" addition
- 🐞 **[Debugging](./debugging.md)** — `MONGODB_DYNAMIC_API_LOGGER` and where the library logs from

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)
