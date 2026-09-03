import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtRefreshGuard } from './jwt-refresh.guard';

describe('JwtRefreshGuard', () => {
  let guard: JwtRefreshGuard;

  beforeEach(() => {
    // Direct instantiation, like every sibling guard spec in this directory (jwt-auth,
    // jwt-socket-auth, local-auth, ...) — going through a real Test.createTestingModule() here
    // isn't needed (JwtRefreshGuard has no explicit constructor of its own) and, under
    // @nestjs/passport v12's AuthGuard() mixin, throws "Nest can't resolve dependencies ...
    // AuthModuleOptions" from @nestjs/testing's TestingInjector even though the mixin's
    // constructor param is @Optional() — a real DI-resolution difference from v11, not something
    // worth working around by adding an unrelated provider just to satisfy this one test.
    guard = new JwtRefreshGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard jwt-refresh', () => {
    expect(guard).toBeInstanceOf(AuthGuard('jwt-refresh'));
  });

  it('should call canActivate from AuthGuard', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer fake-token' } }),
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as unknown as ExecutionContext;

    vi.spyOn(AuthGuard('jwt-refresh').prototype, 'canActivate').mockResolvedValueOnce(true);
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});

