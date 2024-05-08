import { createMock } from '@golevelup/ts-jest';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const reflector = createMock<Reflector>();

  beforeEach(async () => {
    guard = new JwtAuthGuard(reflector);
  });

  it('should have AuthGuard methods', () => {
    expect(guard).toBeDefined();
    expect(guard.logIn).toStrictEqual(expect.any(Function));
    expect(guard.handleRequest).toStrictEqual(expect.any(Function));
    expect(guard.getAuthenticateOptions).toStrictEqual(expect.any(Function));
    expect(guard.getRequest).toStrictEqual(expect.any(Function));
  });
});