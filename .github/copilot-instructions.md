> **🗣️ CAVEMAN MODE ALWAYS ON** — Réponds toujours en mode caveman (level: **full**) par défaut dans chaque message. Pas d'articles, fragments OK, synonymes courts, sans fioritures. Précision technique intacte. Désactivation uniquement si l'utilisateur dit "stop caveman" ou "normal mode". Reprendre caveman dès le message suivant. Consulter `.github/skills/caveman/SKILL.md` pour les règles complètes.

> **🚫 INTERDICTION ABSOLUE de `as any`** — ne JAMAIS utiliser `as any`, `Promise<any>`, `: any`, `[key: string]: any` ou tout autre usage du type `any`. Toujours créer une interface ou un type explicite. Si un type externe est manquant, déclarer une interface locale typée. Cette règle est non-négociable.

> **🇬🇧 Commit messages = English only** — every commit subject and body must be written in English. No French, no mixed language. This applies to all scopes (feat, fix, chore, docs, refactor…). Non-negotiable.

> **📝 Commits : toujours via `scripts/git-commit.cjs`** — NE JAMAIS utiliser `git commit -m "..."` directement sur Windows bash : les sauts de ligne sont squashés et commitlint rejette avec `body-leading-blank`. Utiliser **systématiquement** le helper :
>
> ```bash
> # Sans body (sujet seul)
> node scripts/git-commit.cjs "fix(scope): message court"
>
> # Avec body (saut de ligne via \n\n)
> node scripts/git-commit.cjs "feat(scope): message court\n\nDescription détaillée ici."
>
> # Amend
> node scripts/git-commit.cjs --amend "fix(scope): correction\n\nBody."
> ```
>
> Découper en commits atomiques par scope (feat/fix/refactor/chore…). Format Conventional Commits obligatoire. Si `body-leading-blank` apparaît malgré tout, amender immédiatement avec le helper.

