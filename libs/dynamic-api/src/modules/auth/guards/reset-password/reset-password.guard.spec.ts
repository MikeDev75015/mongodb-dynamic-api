import { ServiceUnavailableException } from '@nestjs/common';
import { ResetPasswordGuard } from './reset-password.guard';

describe('ResetPasswordGuard', () => {
  let guard: ResetPasswordGuard;

  it('should have auth guard methods', () => {
    guard = new ResetPasswordGuard(true);

    expect(guard).toBeDefined();
    expect(guard.canActivate).toStrictEqual(expect.any(Function));
  });

  it('should throw ServiceUnavailableException if not configured', () => {
    guard = new ResetPasswordGuard(false);

    expect(() => guard.canActivate(null)).toThrow(new ServiceUnavailableException('This feature is not available'));
  });

  it('should return true if configured', () => {
    guard = new ResetPasswordGuard(true);

    expect(guard.canActivate(null)).toBe(true);
  });
});
