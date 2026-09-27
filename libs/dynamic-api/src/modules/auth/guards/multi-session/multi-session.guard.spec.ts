import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { MultiSessionGuard } from './multi-session.guard';

describe('MultiSessionGuard', () => {
  it('should throw ServiceUnavailableException when multiSession is disabled', () => {
    const guard = new MultiSessionGuard(false);

    expect(() => guard.canActivate(null)).toThrow(new ServiceUnavailableException('This feature is not available'));
  });

  it('should return true when multiSession is enabled', () => {
    const guard = new MultiSessionGuard(true);

    expect(guard.canActivate(null)).toBe(true);
  });
});
