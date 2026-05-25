> **🗣️ CAVEMAN MODE ALWAYS ON** — Réponds toujours en mode caveman (level: **full**) par défaut dans chaque message. Pas d'articles, fragments OK, synonymes courts, sans fioritures. Précision technique intacte. Désactivation uniquement si l'utilisateur dit "stop caveman" ou "normal mode". Reprendre caveman dès le message suivant. Consulter `.github/skills/caveman/SKILL.md` pour les règles complètes.

> **✅ TESTS & DOC OBLIGATOIRES — NON-NÉGOCIABLE** — Pour CHAQUE modification de code (feat, fix, refactor) :
>
> **Tests unitaires** : couvrir 100% des lignes/branches du code modifié. Tester le happy path, chaque branche conditionnelle, chaque cas d'erreur (exception, guard, edge case). Fichier `*.spec.ts` côte à côte avec le fichier source. Utiliser `it.each` pour les cas multiples similaires.
>
> **Tests e2e** : pour chaque feature touchant les callbacks, les routes ou les services publics → créer ou mettre à jour un `*.e2e-spec.ts` dans `libs/dynamic-api/test/for-feature/` ou `for-root/`. Couvrir le happy path de chaque opérateur/cas + le chemin d'erreur (guard, exception). Utiliser MongoDB réel + NestJS complet via `createTestingApp`.
>
> **Documentation** : mettre à jour TOUS les fichiers `.md` impactés. Chaque nouvelle méthode/type/option doit avoir : description, signature TypeScript complète, exemple de code compilable et complet (import inclus). Pas d'exemple générique — exemples précis avec vrais noms d'entités du projet.
>
> **Ordre d'exécution obligatoire** : 1. Code → 2. Tests unitaires (100% coverage) → 3. Tests e2e (tous verts) → 4. Doc → 5. Commit. Ne jamais committer sans avoir complété les 4 étapes.

> **🏷️ PAS de préfixe `DynamicApi` sur les symboles publics exportés** — Ne JAMAIS préfixer avec `DynamicApi` une classe, interface, type, enum ou modèle qui est exporté dans l'API publique (`libs/dynamic-api/src/index.ts` ou tout barrel re-exporté) et destiné aux utilisateurs de la lib. `DynamicApi*` = usage interne uniquement (helpers internes, stores, builders internes, guards internes). Les symboles publics (models, DTOs, interfaces, types d'options, services) doivent utiliser un nom simple ou un préfixe métier (ex. `BaseEntity`, `SoftDeletableEntity`). Exception : `DynamicApiModule` conservé pour raison historique/brand. Vérifier systématiquement si un nouveau symbole atterrit dans le barrel public — si oui, supprimer le préfixe `DynamicApi`.

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

