[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Migrating to v5

v5 curates the package's public export surface (see the [v5 migration banner](../README.md) for
the full list of removed internal exports), replaces the `@Schema` + schema-options decorator
stack with a single `@DynamicApiSchema` decorator (see [Schema Options](./schema-options.md)), and
retires a batch of verbose/all-caps aliases in favor of their short canonical names.

Most of these changes are purely mechanical renames — a codemod ships with the package to apply
them automatically across your codebase.

## 📋 Table of Contents

- [What the codemod fixes automatically](#what-the-codemod-fixes-automatically)
- [What it can only flag for manual review](#what-it-can-only-flag-for-manual-review)
- [Usage](#usage)
- [Limitations](#limitations)

---

## What the codemod fixes automatically

1. **`DynamicApiGlobalStateService.getEntityModel(Entity)` → `DynamicApiEntityService.getModel(Entity)`**
   ```diff
   - import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';
   + import { DynamicApiEntityService } from 'mongodb-dynamic-api';

   - const model = await DynamicApiGlobalStateService.getEntityModel(User);
   + const model = await DynamicApiEntityService.getModel(User);
   ```

2. **`@DynamicApiSchemaOptions(...)` + `@Schema(...)` → `@DynamicApiSchema(...)`**
   ```diff
   - @DynamicApiSchemaOptions({ indexes: [{ fields: { email: 1 }, options: { unique: true } }] })
   - @Schema({ collection: 'users' })
   + @DynamicApiSchema({
   +   collection: 'users',
   +   indexes: [{ fields: { email: 1 }, options: { unique: true } }],
   + })
     export class User extends BaseEntity {}
   ```
   The deprecated all-caps `@DynamicAPISchemaOptions` spelling is recognized too. Both imports
   and decorator arguments are merged automatically wherever they are plain object literals.

3. **Verbose/all-caps type aliases → their short canonical name** — a pure 1:1 rename, import and
   every usage:
   ```diff
   - import { DynamicAPIRouteConfig } from 'mongodb-dynamic-api';
   + import { DynamicApiRouteConfig } from 'mongodb-dynamic-api';
   ```
   Covers `DynamicAPIRouteConfig`, the 13 `DynamicApiServiceBeforeSave*Context`/`*Callback`
   aliases, `DynamicApiCallbackMethods`, `DynamicApiServiceCallback`, `DynamicAPIServiceProvider`,
   `DynamicAPISwaggerExtraConfig`, `DynamicAPISwaggerOptions` — see the [v5 migration banner](../README.md)
   for the full old-name → new-name table.

4. **`enableDynamicAPIWebSockets(app, 50)` → `enableDynamicAPIWebSockets(app, { maxListeners: 50 })`**
   — rewrites a bare numeric second argument into the options-object form; a non-literal second
   argument (a variable, an expression) is flagged for manual review instead.

Every fix updates the corresponding `import` statement for you, only touching what changed —
everything else in the file is left exactly as it was.

## What it can only flag for manual review

Some things have no direct, mechanical replacement — the codemod reports these instead of
guessing:

- Any `DynamicApiGlobalStateService` member **other than** `getEntityModel` (e.g. `getValue`,
  `addEntitySchema`) — internal state with no public equivalent.
- A `@DynamicApiSchemaOptions`/`@Schema` argument that isn't a plain object literal (e.g. a
  variable reference) — merge it into `@DynamicApiSchema` by hand.
- `enableDynamicAPIWebSockets`'s second argument when it isn't a plain number literal.
- `AnyBeforeSaveCallback` — no successor to rename to; use the discriminated union's per-route
  narrowing directly (each `*RouteConfig` type already carries a precisely-typed
  `beforeSaveCallback`).
- Every other internal export removed in v5 (`BaseService`, internal mixins/guards/interceptors,
  `InMemoryPresenceAdapter`/`RedisPresenceAdapter`, etc.) that your code still imports — each
  warning includes guidance specific to that symbol (e.g. presence adapters point you to
  `DynamicApiPresenceModule.register()`).

**Not scanned at all — a manual change, not a TypeScript import**: WebSocket **clients** still
connecting with `io(url, { query: { accessToken } })` must switch to `io(url, { auth: { token } })`
— the server only reads `socket.handshake.auth.token` in v5 (see the
[v5 migration banner](../README.md)). This is client-side code the codemod has no way to locate
from your server-side `mongodb-dynamic-api` usage.

## Usage

```bash
# Preview changes without writing anything to disk
npx mongodb-dynamic-api migrate-v5 ./src --dry-run

# Apply the fixes
npx mongodb-dynamic-api migrate-v5 ./src
```

The command prints a per-file report — a ✓ line for every automatic fix, a ⚠ line for everything
that needs your attention — and exits with a non-zero status code if anything was left for manual
review (handy in CI as a "did I catch everything" gate).

`.spec.ts`/`.d.ts` files and `node_modules` are skipped automatically.

## Limitations

- A `DynamicApiGlobalStateService` or verbose-alias import aliased with `as`
  (`import { DynamicApiGlobalStateService as GSS } from '...'`) is flagged for manual review
  rather than migrated.
- `@DynamicApiSchemaOptions`/`@Schema` imported under an alias are not detected at all (no
  fix, no warning) — the tool matches on the decorator's local name. Run it before renaming any
  imports yourself if you use aliases.
- Formatting is preserved on a best-effort basis (via TypeScript's own formatter) — review the
  diff before committing, same as with any codemod.

A `mongodb-dynamic-api` import split across **more than one** separate `import` statement in the
same file (e.g. a `import type { CustomRouteConfig } from 'mongodb-dynamic-api';` followed later by
`import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';`) is handled correctly — every
transform searches all matching import declarations, not just the first one in the file. A newly
added value import (e.g. `DynamicApiEntityService`) is never merged into an existing
`import type { ... }` declaration for the module, even when one is already present; it gets its own
declaration instead, so the added name stays usable as a value at runtime.
