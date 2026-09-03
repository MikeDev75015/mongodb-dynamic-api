import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { RateLimit } from './rate-limit.decorator';

// Simulates the optional "@nestjs/throttler" package not being installed at all.
//
// RateLimit() reads it via a synchronous, in-function `require()` (a decorator factory runs
// synchronously at class-definition time, so it can't be an awaited dynamic `import()` — see the
// production file's comment). `vi.mock()` only intercepts static `import`/dynamic `import()`
// specifiers through Vite's module graph, not a bare runtime `require()` call, so it has no effect
// here (confirmed empirically, not assumed) — this bypasses Vite's mocking entirely and instead
// patches Node's real, underlying module loader (`Module._load`) for the duration of this one
// test, exactly the way `require('@nestjs/throttler')` would fail on a machine that truly doesn't
// have the package installed.
//
// No `{ virtual: true }`-style trick here either: the package IS installed (as this repo's own
// devDependency, to exercise the happy path elsewhere) — only this test's own module loader call
// is patched to fail for that one specifier, everything else still resolves normally.
const nodeRequire = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = nodeRequire('module');
let originalLoad: typeof Module._load;

describe('RateLimit — @nestjs/throttler not installed', () => {
  beforeEach(() => {
    originalLoad = Module._load;
    Module._load = function patchedLoad(request: string, ...rest: unknown[]) {
      if (request === '@nestjs/throttler') {
        throw new Error("Cannot find module '@nestjs/throttler'");
      }
      return originalLoad.call(Module, request, ...rest);
    };
  });

  afterEach(() => {
    Module._load = originalLoad;
  });

  it('throws an actionable error instead of an opaque module-not-found error', () => {
    expect(() => RateLimit({ limit: 5, ttl: 60000 })).toThrow(
      '[DynamicAPI] rateLimit is configured but the optional "@nestjs/throttler" package is not '
      + 'installed. Install it with: npm install @nestjs/throttler — and make sure ThrottlerModule '
      + 'is imported in your AppModule.',
    );
  });
});
