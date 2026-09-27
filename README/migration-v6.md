[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Migrating to v6

v6 closes the security gaps that v5.4.2 could not fix without breaking existing apps: the insecure
defaults are gone. None of the changes rename a symbol, so there is no codemod. Walk through the
checklist below; each item states who is affected, what fails, and the fix.

## 📋 Table of Contents

- [Checklist](#checklist)
- [1. JWT secrets are required and must differ](#1-jwt-secrets-are-required-and-must-differ)
- [2. Tokens without a `typ` claim are rejected](#2-tokens-without-a-typ-claim-are-rejected)
- [3. Strict request bodies when validation is configured](#3-strict-request-bodies-when-validation-is-configured)
- [4. `ids` requests fail when one document is missing](#4-ids-requests-fail-when-one-document-is-missing)
- [5. Broadcasts reach authenticated sockets only](#5-broadcasts-reach-authenticated-sockets-only)
- [6. Invalid handshake tokens are refused](#6-invalid-handshake-tokens-are-refused)
- [Front-end checklist](#front-end-checklist)

---

## Checklist

| # | Change | Affects you if… | Symptom |
|---|---|---|---|
| 1 | `jwt.secret` and `jwt.refreshSecret` required, distinct | you use `useAuth` | `forRoot()` throws at startup |
| 2 | `typ` claim required | you have tokens signed before v5.4.2, or sign tokens yourself | `401` on protected routes |
| 3 | `whitelist` + `forbidNonWhitelisted` on bodies | you set `validationPipeOptions` or call `enableDynamicAPIValidation` | `400 property x should not exist` |
| 4 | strict count on `ids` | a `DeleteMany` / `UpdateMany` / `DuplicateMany` route has an `abilityPredicate` | `404 Document not found` |
| 5 | room-less broadcasts → authenticated sockets | you use `useAuth` and `broadcast` without `rooms` | anonymous clients stop receiving events |
| 6 | `rejectInvalidToken: true` by default | clients connect with expired tokens | `connect_error` `Unauthorized: …` |

---

## 1. JWT secrets are required and must differ

v5 fell back to a secret shipped with the package when `useAuth.jwt.secret` was missing (anyone
could forge tokens signed with it), and signed refresh tokens with the access secret when
`refreshSecret` was missing. v6 refuses to start instead:

```
[DynamicAPI] useAuth.jwt.secret is required: set it to a long random value (e.g. from an environment variable).
[DynamicAPI] useAuth.jwt.refreshSecret is required: set it to a long random value, distinct from useAuth.jwt.secret.
[DynamicAPI] useAuth.jwt.refreshSecret must be different from useAuth.jwt.secret.
```

```diff
  // src/app.module.ts
  import { Module } from '@nestjs/common';
  import { DynamicApiModule } from 'mongodb-dynamic-api';
  import { User } from './users/user.entity';

  @Module({
    imports: [
      DynamicApiModule.forRoot(process.env.MONGODB_URI, {
        useAuth: {
          userEntity: User,
          jwt: {
            secret: process.env.JWT_SECRET,
+           refreshSecret: process.env.JWT_REFRESH_SECRET,
          },
        },
      }),
    ],
  })
  export class AppModule {}
```

> If you did not set `refreshSecret` before, the refresh tokens already issued were signed with
> `secret`: they stop working once `refreshSecret` is set, and users log in again once.

See [Token Types and JWT Secrets](./authentication.md#token-types-and-jwt-secrets).

---

## 2. Tokens without a `typ` claim are rejected

Since v5.4.2 every token MDA signs carries `typ: 'access' | 'refresh' | 'reset'`. v5 still
accepted a token without `typ` as an access token; v6 rejects it with `401`. Tokens signed by MDA
≥ 5.4.2 are unaffected; tokens from older versions expire on their own or users log in again.

If you sign access tokens yourself (tests, service accounts), add the claim, or use
[`mintTokenPair`](./authentication.md#minting-tokens-outside-authlogin-minttokenpair):

```typescript
// test/helpers/sign-access-token.ts
import * as jwt from 'jsonwebtoken';

export const signAccessToken = (user: { id: string; email: string }) =>
  jwt.sign({ ...user, typ: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
```

---

## 3. Strict request bodies when validation is configured

When the app configures validation itself, request bodies are now validated with
`whitelist: true` + `forbidNonWhitelisted: true`: a body property without a class-validator
decorator gets a `400` instead of reaching `beforeSave` callbacks and the database.

Validation counts as configured when you call `enableDynamicAPIValidation(app)` or set
`validationPipeOptions` (forRoot, controller or route). Routes without any configured validation
keep the lenient implicit `{ transform: true }`. Query and path params are not affected.

Fix: decorate every property clients may send, or opt out explicitly:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIValidation } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIValidation(app, { transform: true, whitelist: false, forbidNonWhitelisted: false }); // v5 behavior
  await app.listen(3000);
}
bootstrap();
```

See [Strict Bodies by Default](./validation.md#strict-bodies-by-default).

> **Auth routes — upgrade to 6.1.** In 6.0.0 the strict body pipe broke `POST /auth/login` / `POST /auth/register` for fields read by `customValidate` or `beforeSaveCallback` (`property deviceToken should not exist`) and removed a `password` marked `@Exclude({ toPlainOnly: true })` from the request (`password property is required`). 6.1 fixes both: `register.additionalFields` are always accepted, login extras are declared with [`login.additionalBodyFields`](./authentication.md#extra-login-body-fields-additionalbodyfields), and output-only class-transformer rules no longer apply to request bodies. If you replaced `enableDynamicAPIValidation(app)` with a plain `new ValidationPipe()` as a workaround, you can switch back.

---

## 4. `ids` requests fail when one document is missing

On `DeleteMany`, `UpdateMany` and `DuplicateMany` routes guarded by an `abilityPredicate`, v5.4.2
checked every document listed in `ids` but let the request through when some did not exist. v6
answers `404 Not Found` (`WsException` over WebSocket) as soon as one of the `ids` is missing, and
writes nothing. Clients sending stale ids must refresh their list and retry.

See [Which Documents the Guard Checks](./authorization.md#which-documents-the-guard-checks).

---

## 5. Broadcasts reach authenticated sockets only

With `useAuth` enabled, a `broadcast` without `rooms` reached every connected socket in v5,
anonymous ones included. In v6 it only reaches sockets that connected with a valid access token
or logged in through the `auth-login` event (they join `DYNAMIC_API_AUTHENTICATED_ROOM`). Apps
without `useAuth` are unaffected.

Keep a feed public with `public: true`:

```typescript
// src/articles/articles.module.ts
import { Module } from '@nestjs/common';
import { DynamicApiModule } from 'mongodb-dynamic-api';
import { Article } from './article.entity';

@Module({
  imports: [
    DynamicApiModule.forFeature({
      entity: Article,
      controllerOptions: { path: 'articles' },
      routes: [
        { type: 'CreateOne', broadcast: { enabled: true, public: true } }, // every socket, as in v5
        { type: 'UpdateOne', broadcast: { enabled: true } },               // authenticated sockets only
      ],
    }),
  ],
})
export class ArticlesModule {}
```

The same applies to auth broadcasts (`useAuth.login.broadcast`, `register`, `getAccount`,
`updateAccount`). If you install your own Socket.IO adapter instead of
`enableDynamicAPIWebSockets(app)` / `SocketAdapter`, join `DYNAMIC_API_AUTHENTICATED_ROOM`
yourself once a socket is authenticated.

See [Authenticated-Only Broadcasts](./websockets.md#authenticated-only-broadcasts).

---

## 6. Invalid handshake tokens are refused

`rejectInvalidToken` now defaults to `true`: a socket connecting with an expired, malformed or
wrongly signed token gets a `connect_error` (`Unauthorized: jwt expired`, …) instead of being
accepted as anonymous with an `unauthorized` event. Sockets connecting without a token are still
accepted.

Keep the v5 behavior:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableDynamicAPIWebSockets(app, { rejectInvalidToken: false });
  await app.listen(3000);
}
bootstrap();
```

See [Invalid or Expired Handshake Tokens](./websockets.md#invalid-or-expired-handshake-tokens).

---

## Front-end checklist

- **Refresh before reconnecting.** Handle `connect_error` messages starting with `Unauthorized:`:
  refresh the access token, then call `socket.connect()` (a middleware refusal disables
  auto-reconnect). Pass `auth` as a function so every reconnection sends the current token.

  ```typescript
  import { io } from 'socket.io-client';
  import { refreshAccessToken } from './auth-api';

  const socket = io('http://localhost:3000', {
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
  });

  socket.on('connect_error', async (error) => {
    if (error.message.startsWith('Unauthorized:')) {
      localStorage.setItem('accessToken', await refreshAccessToken());
      socket.connect();
    }
  });
  ```

- **Reconnect after login.** A socket opened anonymously only receives authenticated broadcasts
  after the `auth-login` event, or after reconnecting with the new token.
- **Anonymous pages.** Pages that listen to broadcasts without a token only receive routes marked
  `public: true`.
- **Stale ids.** Handle `404` on `DeleteMany` / `UpdateMany` / `DuplicateMany` by refreshing the list.
- **Extra body fields.** Stop sending properties the entity does not declare (UI-only flags,
  computed fields) when the server configures validation.
