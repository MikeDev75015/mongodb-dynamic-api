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
   - Run `npx jest <file>.spec.ts --coverage` and verify 100% before committing

2. **Documentation** (all impacted `.md` files)
   - Every new method / type / option: description + full TypeScript signature + complete compilable code example (imports included)
   - No generic placeholder examples — use real entity names from the project
   - Update the Table of Contents if a new section is added

3. **Commit only after steps 1 and 2 are fully done.**

Skipping tests or doc = invalid delivery. No exception.

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

<!-- ↓ Fill this section for your project ↓ -->

| Path | Role |
|------|------|
| `<!-- src/ -->` | `<!-- Main source -->` |

### Stack

<!-- List your languages, frameworks, libraries here -->

### Key Patterns & Conventions

<!-- Describe entity patterns, state management, routing, etc. -->

### Quick Commands

```bash
# <!-- Add your dev/build/test commands here -->
```

---

## Deployment

<!-- Describe your deployment targets and commands -->

