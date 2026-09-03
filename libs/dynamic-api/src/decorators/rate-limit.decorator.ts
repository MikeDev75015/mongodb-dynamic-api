import { applyDecorators, UseGuards } from '@nestjs/common';
import { RateLimitConfig } from '../interfaces';

/**
 * Applies `@nestjs/throttler`'s `@Throttle()` + `ThrottlerGuard` to a generated auth route when
 * `config` is provided — a no-op otherwise. `@nestjs/throttler` is an **optional** dependency:
 * it's only `require()`-d (and only needs to be installed) when `config` is actually set.
 *
 * Requires `ThrottlerModule` to still be imported in your own `AppModule` — this decorator only
 * wires the per-route guard/limits, it doesn't configure global throttler storage/options.
 *
 * @internal Not part of the public API.
 */
function RateLimit(config: RateLimitConfig | undefined): MethodDecorator {
  if (!config) {
    return () => undefined;
  }

  let throttler: typeof import('@nestjs/throttler');

  try {
    throttler = require('@nestjs/throttler');
  } catch {
    throw new Error(
      '[DynamicAPI] rateLimit is configured but the optional "@nestjs/throttler" package is not '
      + 'installed. Install it with: npm install @nestjs/throttler — and make sure ThrottlerModule '
      + 'is imported in your AppModule.',
    );
  }

  const { limit, ttl, blockDuration } = config;

  return applyDecorators(
    UseGuards(throttler.ThrottlerGuard),
    throttler.Throttle({ default: { limit, ttl, ...(blockDuration ? { blockDuration } : {}) } }),
  );
}

export { RateLimit };
