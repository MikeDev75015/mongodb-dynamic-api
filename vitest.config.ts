import { resolve } from 'node:path';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Unit test config (mirrors the Jest config previously inlined in package.json's "jest" field).
 * Scope: libs/**\/*.spec.ts only — *.e2e-spec.ts files are excluded by the glob itself (a
 * filename ending in "-spec.ts" does not match "*.spec.ts", no extra exclude needed) and run
 * under vitest.e2e.config.ts instead.
 */
export default defineConfig({
  // Vite 8 (bundled with vitest 4) transforms TS via Rolldown/oxc by default, which does not
  // support the legacy `experimentalDecorators` + `emitDecoratorMetadata` combo this codebase
  // (NestJS decorators, class-validator property decorators) relies on everywhere — parsing
  // `@Dec() prop: string;` throws a bare SyntaxError with no useful location. unplugin-swc swaps
  // the transform to @swc/core (already a devDependency), auto-inferring both flags from
  // tsconfig.json (which already sets them for the real `tsc` build) — this is the standard
  // NestJS+Vitest recipe, not a workaround specific to this repo. Discovered empirically in the
  // Phase 2 pilot (see VITEST-MIGRATION-PLAN.md), not something the original plan anticipated.
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      // tsconfig.json's "target": "ES2021" is inferred case-sensitively by unplugin-swc and SWC
      // rejects the uppercase form ("unknown variant `ES2021`") — override with the lowercase
      // spelling SWC expects; decorators/metadata inference from tsconfig.json is untouched.
      jsc: { target: 'es2021' },
    }),
  ],
  resolve: {
    alias: {
      // Fixed alias so the create-mock helper's import path doesn't depend on each spec file's
      // depth in the tree (kept stable across the codemod that will touch every *.spec.ts file).
      '@test-helpers': resolve(__dirname, 'libs/dynamic-api/test/helpers'),
    },
  },
  test: {
    // No `globals: true`: *.e2e-spec.ts files are NOT excluded from the plain `tsc` build (only
    // *.spec.ts and *.mock.ts are, per tsconfig.json's "exclude" — verified with
    // `tsc --listFilesOnly`, all 53 e2e-spec files are compiled to dist today). Turning on
    // ambient globals would need a `vitest/globals` types reference that collides with
    // @types/jest's own ambient describe/it/expect during the Jest+Vitest coexistence window.
    // Explicit `import { describe, it, expect, vi, ... } from 'vitest'` per file sidesteps that
    // entirely and is applied consistently to *.spec.ts too, even though those are tsc-excluded.
    environment: 'node',
    include: ['libs/**/*.spec.ts'],
    clearMocks: true,
    coverage: {
      provider: 'istanbul',
      reportsDirectory: 'coverage',
      // istanbul chosen over v8 for parity with Jest's own istanbul-based coverage model, to
      // avoid a coverage-% swing on SonarCloud's quality gate that isn't a real regression.
      exclude: [...coverageConfigDefaults.exclude, '**/*.mock.ts'],
    },
  },
});
