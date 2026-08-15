import { ThrottlerGuard } from '@nestjs/throttler';
import { RateLimit } from './rate-limit.decorator';

// Mirrors @nestjs/common's GUARDS_METADATA and @nestjs/throttler's THROTTLER_LIMIT/TTL/
// BLOCK_DURATION constants (neither is exported from either package's public barrel, so the
// literal values — confirmed against their compiled source — are the only way to assert on the
// metadata @UseGuards()/@Throttle() actually write).
const GUARDS_METADATA = '__guards__';
const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';
const THROTTLER_BLOCK_DURATION_DEFAULT = 'THROTTLER:BLOCK_DURATIONdefault';

describe('RateLimit', () => {
  class TestController {
    method() {}
  }

  const decorate = (config: Parameters<typeof RateLimit>[0]) => {
    const descriptor = Object.getOwnPropertyDescriptor(TestController.prototype, 'method');
    RateLimit(config)(TestController.prototype, 'method', descriptor);
    return descriptor.value;
  };

  it('should be a no-op decorator when config is undefined', () => {
    const decorator = RateLimit(undefined);

    expect(decorator({}, 'method', {} as PropertyDescriptor)).toBeUndefined();
  });

  it('should not attach any guard or throttler metadata when config is undefined', () => {
    const method = decorate(undefined);

    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toBeUndefined();
    expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, method)).toBeUndefined();
  });

  it('should attach ThrottlerGuard and the limit/ttl metadata when config is set', () => {
    const method = decorate({ limit: 5, ttl: 60000 });

    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toContain(ThrottlerGuard);
    expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, method)).toBe(5);
    expect(Reflect.getMetadata(THROTTLER_TTL_DEFAULT, method)).toBe(60000);
    expect(Reflect.getMetadata(THROTTLER_BLOCK_DURATION_DEFAULT, method)).toBeUndefined();
  });

  it('should forward blockDuration when provided', () => {
    const method = decorate({ limit: 5, ttl: 60000, blockDuration: 300000 });

    expect(Reflect.getMetadata(THROTTLER_BLOCK_DURATION_DEFAULT, method)).toBe(300000);
  });
});
