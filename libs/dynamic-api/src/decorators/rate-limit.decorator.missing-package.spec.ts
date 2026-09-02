import { describe, expect, it, vi } from 'vitest';
import { RateLimit } from './rate-limit.decorator';

// Simulates the optional "@nestjs/throttler" package not being installed at all.
// No `{ virtual: true }` here: the package IS installed (as this repo's own devDependency, to
// exercise the happy path elsewhere) — virtual would tell Jest the module doesn't exist on disk,
// which is false and makes this mock unreliable across files in a full-suite run.
vi.mock('@nestjs/throttler', () => {
  throw new Error("Cannot find module '@nestjs/throttler'");
});

describe('RateLimit — @nestjs/throttler not installed', () => {
  it('throws an actionable error instead of an opaque module-not-found error', () => {
    expect(() => RateLimit({ limit: 5, ttl: 60000 })).toThrow(
      '[DynamicAPI] rateLimit is configured but the optional "@nestjs/throttler" package is not '
      + 'installed. Install it with: npm install @nestjs/throttler — and make sure ThrottlerModule '
      + 'is imported in your AppModule.',
    );
  });
});
