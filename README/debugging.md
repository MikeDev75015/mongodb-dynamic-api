[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)

---

# Debugging & Observability

`mongodb-dynamic-api` logs internally from guards, broadcast, callbacks, and auth — all silent by default. This page documents how to turn that on when you need to see what the library is actually doing.

## 📋 Table of Contents

- [Two independent debug switches](#two-independent-debug-switches)
- [`MONGODB_DYNAMIC_API_LOGGER`](#mongodb_dynamic_api_logger)
  - [Log levels](#log-levels)
  - [Enabling it](#enabling-it)
  - [⚠️ Common mistake: invalid values disable everything](#️-common-mistake-invalid-values-disable-everything)
- [Where it logs from](#where-it-logs-from)
- [Practical recipes](#practical-recipes)
- [Related Documentation](#related-documentation)

---

## Two independent debug switches

| Switch | Scope | Configured via |
|---|---|---|
| **`MONGODB_DYNAMIC_API_LOGGER`** (this page) | Library-wide: guards, `afterSaveCallback` failures, broadcast, the event registry, auth, presence — everything that isn't WebSocket-connection-specific. | Environment variable, read once at process start. |
| **`debug: true`** | WebSocket connection lifecycle only: socket connect/disconnect, `join-rooms`/`leave-rooms`, and `BaseGateway.broadcastIfNeeded` emit lines. | `enableDynamicAPIWebSockets(app, { debug: true })` — see [WebSockets → Debug Mode](./websockets.md#debug-mode). |

They're independent — you can enable either, both, or neither. Most of the time you want `MONGODB_DYNAMIC_API_LOGGER`; reach for WebSocket `debug: true` only when diagnosing connection/room issues specifically.

---

## `MONGODB_DYNAMIC_API_LOGGER`

Every internal log call in the library goes through `MongoDBDynamicApiLogger`, a thin wrapper around NestJS's `Logger` that is **silent unless `MONGODB_DYNAMIC_API_LOGGER` is set** in the environment.

### Log levels

The variable's value sets a threshold — set it to the *most detailed* level you want to see; everything at or below that detail level (as defined below) is shown, everything above it is hidden.

| Value | `debug()` | `log()` | `warn()` | `error()` |
|---|:---:|:---:|:---:|:---:|
| `DEBUG` | ✅ | ✅ | ✅ | ✅ |
| `INFO` | ❌ | ✅ | ✅ | ✅ |
| `WARN` | ❌ | ❌ | ✅ | ✅ |
| `ERROR` | ❌ | ❌ | ❌ | ✅ |

### Enabling it

```bash
# One-off, local dev
MONGODB_DYNAMIC_API_LOGGER=DEBUG npm run start:dev
```

```dotenv
# .env — quieter, production-safe default
MONGODB_DYNAMIC_API_LOGGER=WARN
```

Leave it **unset** (the default) in production unless you're actively investigating something — even `WARN` has a small per-call overhead, and `DEBUG` is verbose.

### ⚠️ Common mistake: invalid values disable everything

The value must be exactly one of `DEBUG`, `INFO`, `WARN`, `ERROR` (case-sensitive). Any other value — a typo, `true`, `1`, `"on"` — still counts as "set" (so logging is technically enabled), but matches **none** of the levels above, so every call is silently suppressed. If you set the variable and still see nothing, check the exact spelling first.

---

## Where it logs from

| Source | Context string | What you'll see |
|---|---|---|
| `BaseService` (`services/base/base.service.ts`) | `BaseService` | `handleAbilityPredicate` debug traces; **`[AfterSaveCallback] Failed for <Entity> after N attempt(s): …`** when a `callback` exhausts its `callbackRetry` attempts (see [Callbacks → Failure isolation guarantee](./callbacks.md#failure-isolation-guarantee)); `[onAfterSaveError] Global hook itself threw: …` if your `onAfterSaveError` hook throws. |
| `DynamicApiBroadcastService` (`services/dynamic-api-broadcast/`) | `DynamicApiBroadcastService` | `[Broadcast] Failed to emit "<event>": …` when a broadcast triggered by an HTTP route fails to emit. |
| `BaseGateway` (`gateways/base.gateway.ts`) | `BaseGateway` | `[WS] Failed to emit "<event>": …` (the WebSocket-triggered equivalent of the line above); `[WS] broadcastIfNeeded – event=…` lines when `debug: true` is *also* enabled (see the other switch, above). |
| `DynamicApiEventRegistryStore` (`helpers/event-registry.store.ts`) | `DynamicApiEventRegistryStore` | `[Broadcast Registry] Event name collision on "<event>": …` at bootstrap when two unrelated routes resolve to the same broadcast event name — see [WebSockets → Event Name Collisions](./websockets.md#event-name-collisions). |
| `BasePoliciesGuard` / socket variant (`guards/base-policies.guard.ts`) | `SocketPoliciesGuard-<RouteType>-<Entity>` | `canActivate` debug traces for WebSocket ability-predicate checks. |
| `SocketAdapter` (`adapters/socket-adapter.ts`) | `SocketAdapter` | Connection accept/reject and JWT verification traces. |
| `JwtSocketGuard`, `JwtSocketAuthGuard`, `JwtSocketRefreshGuard` | matches the class name | WebSocket JWT verification failures. |
| `DynamicApiBroadcastGateway` (`gateways/dynamic-api-broadcast.gateway.ts`) | `DynamicApiBroadcastGateway` | `join-rooms` / `leave-rooms` traces (also gated by WS `debug: true`). |
| `AuthService` (`modules/auth/services/base-auth.service.ts`) | `AuthService` | Login/register/refresh-token flow traces. |
| `PresenceGateway` (`modules/presence/`) | `PresenceGateway` | Online/offline tracking traces — see [Presence](./presence.md). |

All of these are silent unless `MONGODB_DYNAMIC_API_LOGGER` is set to a level that includes the call's severity (see the table above) — most of the lines listed are `error`/`warn` calls, so `MONGODB_DYNAMIC_API_LOGGER=WARN` is usually enough to see them without the verbosity of `DEBUG`.

---

## Practical recipes

**"My `afterSaveCallback` seems to silently fail — the request succeeds but my side effect never happens."**
Set `MONGODB_DYNAMIC_API_LOGGER=WARN` (or `ERROR`) and look for `[AfterSaveCallback] Failed for …` — this is expected: since [point 6's reliability fix](./callbacks.md#failure-isolation-guarantee), a failing `callback` never surfaces as an HTTP error, it's caught and logged instead.

**"My WebSocket broadcast never reaches clients."**
First check for a `[Broadcast Registry] Event name collision` warning at startup — two routes might be emitting on the same event name. Then set `MONGODB_DYNAMIC_API_LOGGER=WARN` and look for `[Broadcast] Failed to emit` / `[WS] Failed to emit`.

**"I need to see every WebSocket connection and room join/leave."**
That's the *other* switch — `enableDynamicAPIWebSockets(app, { debug: true })` — not this env var. See [WebSockets → Debug Mode](./websockets.md#debug-mode).

---

## Related Documentation

- 📡 **[WebSockets → Debug Mode](./websockets.md#debug-mode)** — the connection-lifecycle debug switch
- 📡 **[WebSockets → Event Name Collisions](./websockets.md#event-name-collisions)** — what the registry warning means and how to fail fast on it
- 🔁 **[Callbacks → Failure isolation guarantee](./callbacks.md#failure-isolation-guarantee)** — why `callback` failures are logged, not thrown

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/main/README.md)
