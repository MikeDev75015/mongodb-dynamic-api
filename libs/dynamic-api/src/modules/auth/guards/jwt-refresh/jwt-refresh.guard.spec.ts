import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtRefreshGuard } from './jwt-refresh.guard';

describe('JwtRefreshGuard', () => {
  let guard: JwtRefreshGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtRefreshGuard],
    }).compile();

    guard = moduleRef.get<JwtRefreshGuard>(JwtRefreshGuard);
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
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(AuthGuard('jwt-refresh').prototype, 'canActivate').mockResolvedValueOnce(true);
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});

