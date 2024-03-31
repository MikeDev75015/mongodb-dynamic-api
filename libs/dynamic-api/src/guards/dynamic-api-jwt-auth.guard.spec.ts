import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { DynamicApiModule } from '../dynamic-api.module';
import { DynamicApiJwtAuthGuard } from './dynamic-api-jwt-auth.guard';
import { DynamicApiGlobalState } from '../interfaces';

describe('DynamicApiJwtAuthGuard', () => {
  let guard: DynamicApiJwtAuthGuard;
  let reflector: Reflector;
  let context: ExecutionContext;

  beforeEach(async () => {
    DynamicApiModule.state.set(['partial', {
      isAuthEnabled: true,
      initialized: true,
    }]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: 'DynamicApiGlobalState', useValue: DynamicApiModule.state.get() },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        {
          provide: DynamicApiJwtAuthGuard,
          inject: [Reflector, 'DynamicApiGlobalState'],
          useFactory: (reflector, state) =>
            new DynamicApiJwtAuthGuard(reflector, state),
        },
      ],
    }).compile();

    guard = moduleRef.get<DynamicApiJwtAuthGuard>(DynamicApiJwtAuthGuard);
    reflector = moduleRef.get<Reflector>(Reflector);
    context = { getHandler: jest.fn(), getClass: jest.fn() } as any;
  });

  it('should allow access if route is public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if auth is not enabled', () => {
    guard['state'].isAuthEnabled = false;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if route is not public and auth is enabled', () => {
    const spy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockImplementationOnce(() => false);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(false);
    expect(spy).toHaveBeenCalledWith(context);
  });

  it('should allow access if route is not public and auth is enabled', () => {
    const spy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockImplementationOnce(() => true);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);


    expect(guard.canActivate(context)).toBe(true);
    expect(spy).toHaveBeenCalledWith(context);
  });
});