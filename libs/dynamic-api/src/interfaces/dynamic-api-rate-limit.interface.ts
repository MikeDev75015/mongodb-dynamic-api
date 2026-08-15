/**
 * Rate-limit configuration applied to a single generated auth route.
 * Mirrors `@nestjs/throttler`'s own `{ limit, ttl }` shape so it maps 1:1 onto a `@Throttle()`
 * call — defined locally (rather than importing `@nestjs/throttler`'s own type) so this package's
 * public types never require the optional `@nestjs/throttler` package to be installed just to
 * type-check.
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed within `ttl`. */
  limit: number;
  /** Time window, in milliseconds, `limit` applies to. */
  ttl: number;
  /**
   * Extra delay (in milliseconds), on top of `ttl`, before a client that hit the limit is
   * allowed to try again. Forwarded as-is to `@nestjs/throttler`'s `blockDuration`.
   */
  blockDuration?: number;
}

export type { RateLimitConfig };
