import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let context: ExecutionContext;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
    context = { switchToHttp: () => ({
        getRequest: jest.fn().mockReturnValue({}),
    }) } as any;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});