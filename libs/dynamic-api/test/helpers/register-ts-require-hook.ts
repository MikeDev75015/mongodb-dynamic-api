// @angular-devkit/schematics' NodeModulesTestEngineHost loads a schematic's factory file (per
// collection.json's "factory": "./resource/index#resource") via a bare, native Node `require()` —
// NOT through Vite's own SSR module pipeline, since it's the @angular-devkit/schematics package's
// own internal code doing the require, invoked by libs/schematics/resource/index.spec.ts. Node's
// real require() has no idea how to parse TypeScript, and unlike ts-jest (which registers a
// process-wide require hook for .ts under Jest), Vitest's transform is scoped to files it loads
// itself through its Vite-based module graph. Without this, that require() fails outright with
// "Cannot find module '.../resource/index'" (it never even gets to a syntax error - plain
// require() doesn't try the .ts extension at all by default).
//
// This registers the same kind of require.extensions['.ts'] hook ts-jest provided, using
// @swc/core's synchronous transform (already a devDependency, already this repo's Vitest
// transform elsewhere) so a plain `require('./index.ts')` from anywhere in this process — not
// just Vitest's own module loading — produces working CommonJS.
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { transformSync } from '@swc/core';

const extensions = Module as unknown as { _extensions: Record<string, (module: NodeModule, filename: string) => void> };

extensions._extensions['.ts'] = (mod, filename) => {
  const source = readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    jsc: {
      target: 'es2021',
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
    },
    // CommonJS here (unlike vitest.config.ts's 'es6'): this hook feeds Node's own native
    // require(), not Vite's SSR module runner, so it needs real `module.exports`/`require(...)`.
    module: { type: 'commonjs' },
  });
  (mod as unknown as { _compile: (code: string, filename: string) => void })._compile(code, filename);
};
