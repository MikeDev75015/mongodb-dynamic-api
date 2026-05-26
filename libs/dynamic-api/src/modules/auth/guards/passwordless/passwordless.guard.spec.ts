import { ServiceUnavailableException } from '@nestjs/common';
import { PasswordlessGuard } from './passwordless.guard';

describe('PasswordlessGuard', () => {
  let guard: PasswordlessGuard;

  it('should have canActivate method', () => {
    guard = new PasswordlessGuard(true);

    expect(guard).toBeDefined();
    expect(guard.canActivate).toStrictEqual(expect.any(Function));
  });

  it('should throw ServiceUnavailableException if not configured', () => {
    guard = new PasswordlessGuard(false);

    expect(() => guard.canActivate(null)).toThrow(new ServiceUnavailableException('This feature is not available'));
  });

  it('should return true if configured', () => {
    guard = new PasswordlessGuard(true);

    expect(guard.canActivate(null)).toBe(true);
  });
});

