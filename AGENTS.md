> **🗣️ CAVEMAN MODE ALWAYS ON** — Réponds toujours en mode caveman (level: **full**) par défaut dans chaque message. Pas d'articles, fragments OK, synonymes courts, sans fioritures. Précision technique intacte. Désactivation uniquement si l'utilisateur dit "stop caveman" ou "normal mode". Reprendre caveman dès le message suivant. Consulter `.github/skills/caveman/SKILL.md` pour les règles complètes.

# AI Agent Guide — Base Template

> Copy this file to your project root as `AGENTS.md` and fill in the project-specific sections below.

## Universal Rules

### ✅ Tests & Doc — Mandatory, Non-Negotiable

**Every code change (feat / fix / refactor) MUST include, in this order:**

1. **Unit tests** (`*.spec.ts` alongside the source file)
   - 100% line + branch coverage on every modified file
   - Happy path + every conditional branch + every thrown exception + edge cases
   - Use `it.each` for similar multi-case scenarios
   - Run `npx vitest run <file>.spec.ts --coverage` and verify 100% before committing

2. **E2E tests** (`*.e2e-spec.ts` in `libs/dynamic-api/test/for-feature/` or `for-root/`)
   - For every feature touching callbacks, routes, or public services
   - Cover happy path for each operator/case + error paths (guard, exceptions)
   - Use real MongoDB + full NestJS app via `createTestingApp`
   - Run `npx vitest run --config vitest.e2e.config.mts <file>` and verify all green

3. **Documentation** (all impacted `.md` files)
   - Every new method / type / option: description + full TypeScript signature + complete compilable code example (imports included)
   - No generic placeholder examples — use real entity names from the project
   - Update the Table of Contents if a new section is added

4. **Commit only after steps 1, 2 and 3 are fully done.**

Skipping tests or doc = invalid delivery. No exception.

---

### 🏷️ No `DynamicApi` Prefix on Models

**Never** prefix with `DynamicApi` any class, interface, type, or enum that represents a **data model** — whether public or internal.

- `DynamicApi*` prefix = **technical NestJS constructs only**: modules, injectable services, guards, filters, interceptors, internal helpers/stores, builders, mixins.
- **Models** (DTOs, config interfaces, options types, domain types, callbacks) **must use a plain name or a domain-specific prefix** regardless of visibility (e.g., `BaseEntity`, `BroadcastConfig`, `BeforeSaveCallback`, `RouteConfig`).
- Rule of thumb: ask "is this a data model?" → if yes, drop `DynamicApi`.
- Exception: `DynamicApiModule` itself is kept for historical/brand reasons.
- When adding or renaming a symbol: if it's a model (interface, type, DTO, enum), strip `DynamicApi` unconditionally.

---

### 🚫 No `any` — Ever

Never use `as any`, `Promise<any>`, `: any`, `[key: string]: any`. Always create an explicit interface or type. If an external type is missing, declare a local typed interface. Non-negotiable.

### 🇬🇧 Commit Messages = English Only

Every commit subject and body must be written in English. No mixed language. Applies to all scopes (feat, fix, chore, docs, refactor…).

### 📝 Commits: Always via `scripts/git-commit.cjs`

NEVER use `git commit -m "..."` directly on Windows bash — newlines get squashed and commitlint rejects with `body-leading-blank`. Always use the helper:

```bash
# Subject only
node scripts/git-commit.cjs "fix(scope): short message"

# With body (newline via \n\n)
node scripts/git-commit.cjs "feat(scope): short message\n\nDetailed description here."

# Amend
node scripts/git-commit.cjs --amend "fix(scope): correction\n\nBody."
```

Split into atomic commits per scope (feat/fix/refactor/chore…). Conventional Commits format required. If `body-leading-blank` appears, amend immediately with the helper.

### 🗣️ Caveman Mode

Default: **full**. Active every response. Off only when user says "stop caveman" or "normal mode". Resume next message. Full rules in `.github/skills/caveman/SKILL.md`.

Levels: `/caveman lite` | `/caveman` (full) | `/caveman ultra`

---

## Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **caveman** | `/caveman [lite\|full\|ultra]` | Ultra-compressed communication (~75% token cut) |
| **cavecrew** | `use cavecrew` | Delegate to compressed subagents (investigator/builder/reviewer) |
| **caveman-commit** | `/caveman-commit` | Terse Conventional Commits generator |
| **caveman-review** | `/caveman-review` | One-line PR review comments |
| **caveman-help** | `/caveman-help` | Quick reference card |
| **caveman-stats** | `/caveman-stats` | Token usage stats (requires hooks) |

Skills live in `.github/skills/` (GitHub Copilot Cloud) and `.agents/skills/` (local IDE).

---

## Project Architecture

| Path | Role |
|------|------|
| `libs/dynamic-api/src/` | Library source (published to npm as `mongodb-dynamic-api`); unit specs `*.spec.ts` live next to each file |
| `libs/dynamic-api/test/for-feature/`, `for-root/` | E2E specs (`*.e2e-spec.ts`), real MongoDB + full NestJS app |
| `libs/dynamic-api/test/e2e.setup.ts`, `test/shared/` | E2E helpers (`createTestingApp`, `initApp`, `initModule`) |
| `libs/dynamic-api/codemods/` | `migrate-v5` CLI codemod (package `bin`) |
| `libs/schematics/` | Nest CLI schematics, separate build (`tsconfig.schematics.json`) |
| `README.md`, `README/*.md` | User documentation (one file per topic) |
| `scripts/` | `git-commit.cjs` (commit helper), `cloud-setup.sh` + `cloud-mongo.cjs` (Claude Code cloud bootstrap) |
| `.circleci/config.yml` | CI + release pipeline |

### Stack

TypeScript, NestJS 12, Mongoose 8 (MongoDB), class-validator/class-transformer, socket.io, Vitest 4 (+ `unplugin-swc` for decorator metadata), release-it, CircleCI, SonarCloud.

### Key Patterns & Conventions

- Decorators: flat files in `src/decorators/`, option interfaces exported in the same file, JSDoc with full `@example`, re-exported alphabetically from `decorators/index.ts`.
- `DynamicApiGlobalStateService.getEntityModel(Entity)` fetches the Mongoose model of any registered entity from anywhere in the lib (no DI wiring needed).
- E2E needs a MongoDB **replica set** (transactions, cascade delete) reachable via `MONGO_DB_URL` (from env or `.env`). Locally: `docker compose up -d` (`compose.yaml`, port 27018). Cloud: started automatically, see below. E2E files run sequentially on one shared DB (`fileParallelism: false`) — keep it that way.
- Second entity in an e2e test: nest another `DynamicApiModule.forFeature(...)` in `extraImports` (see `cascade-and-before-delete.e2e-spec.ts`).
- `BaseEntity._id` is typed `mongoose.ObjectId` (schema class, not the runtime value): stringify with `(doc._id as { toString(): string }).toString()`, a `Types.ObjectId` cast fails `tsc`.
- `tslint` (`npm run lint`) is broken with the current TS version — type-check with `npx tsc --noEmit` instead.
- `scripts/git-commit.cjs` runs `git add -A` (stages everything). For split/atomic commits, `git add <files>` then `git commit --file=<tmp file>` instead.
- Prefer targeted spec runs; don't run the full unit/e2e suites before a push unless asked (CI runs them).

### Quick Commands

```bash
npm ci                                                    # install
npx tsc --noEmit                                          # type-check
npx vitest run libs/dynamic-api/src/<path>.spec.ts --coverage   # one unit spec + coverage
npx vitest run --config vitest.e2e.config.mts libs/dynamic-api/test/<path>.e2e-spec.ts  # one e2e spec
npm run test-e2e                                          # full e2e suite (slow)
npm run build                                             # lib + schematics build
docker compose up -d                                      # local MongoDB replica set (not in cloud)
```

### Claude Code cloud sessions (claude.ai/code)

- `.claude/settings.json` runs `scripts/cloud-setup.sh` on SessionStart. It is a no-op unless `CLAUDE_CODE_REMOTE=true`.
- In cloud it runs `npm ci` if needed, starts a Docker-free single-member replica set with `mongodb-memory-server` (`scripts/cloud-mongo.cjs`, port 27018, log in `/tmp/mda-cloud-mongo.log`) and exports `MONGO_DB_URL` (also written to `.env`).
- If the hook warns that MongoDB is not ready, the environment's network policy is probably blocking `fastdl.mongodb.org` (mongod binary download). Unit tests still work; restart manually with `node scripts/cloud-mongo.cjs &` once network is allowed.
- Work on a branch (never `main`), push it, open a PR to `main`. Never approve a release, never `npm publish`.

---

## Deployment

Trunk-based on `main` (no `develop` branch). Every push to a branch other than `main` runs CircleCI `ci-default-workflow`: build, unit tests + SonarCloud, e2e (Docker MongoDB). `build-job`, `test-job` and `e2e-tests-mongodb-job` are required checks on `main`.

Release is opt-in and **approved by a human in CircleCI only**: approving `confirm-release-job` → `release-pr-job` runs release-it on the branch (version bump + CHANGELOG, opens the PR if missing) → the release commit's pipeline rebase-merges the PR (`merge-release-pr-job`) → `ci-main-workflow` tags `vX.Y.Z` → `cd-release-version-workflow` publishes to npm. Leaving the approval pending merges nothing to npm; the next release picks the commits up.

npm publish uses **trusted publishing (OIDC)**: no `NPM_TOKEN`, no `.npmrc`, no 2FA prompt. `publish-npm-command` exports `NPM_ID_TOKEN` from `circleci run oidc get` (audience `npm:registry.npmjs.org`) and npm (>= 11.5.1) exchanges it for a short-lived token. The trusted publisher is configured on npmjs.com (package Settings); it must match the CircleCI org, project, pipeline definition and context.

So from any environment (local or cloud), "deploy" = push a branch with green checks + PR, then the owner approves `confirm-release-job`.

