import { Test } from '@nestjs/testing';
import { LocalAuthGuard } from './local-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { mock } from 'jest-mock-extended';

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;
  let context: ExecutionContext;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LocalAuthGuard],
    }).compile();

    guard = moduleRef.get<LocalAuthGuard>(LocalAuthGuard);
    context = mock<ExecutionContext>();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should handle exception when canActivate fails', async () => {
    jest.spyOn(guard, 'canActivate').mockImplementationOnce(() => {
      throw new Error();
    });

    try {
      await guard.canActivate(context);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});