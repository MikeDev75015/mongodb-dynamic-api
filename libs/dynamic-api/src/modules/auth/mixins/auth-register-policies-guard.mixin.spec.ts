import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseEntity } from '../../../models';
import { AuthRegisterPoliciesGuardMixin } from './auth-register-policies-guard.mixin';

jest.mock(
  '@casl/ability',
  () => (
    {
      AbilityBuilder: jest.fn(() =>
        (
          {
            can: jest.fn(),
            build: jest.fn(),
          } as any
        )),
      PureAbility: jest.fn(() => (
        {}
      )),
    }
  ),
);

describe('AuthRegisterPoliciesGuardMixin', () => {
  let guard;
  let reflector: Reflector;
  let context: ExecutionContext;

  class TestEntity extends BaseEntity {}

  beforeEach(async () => {
    reflector = {
      get: jest.fn(),
    } as unknown as Reflector;

    const Guard = AuthRegisterPoliciesGuardMixin(TestEntity, (user) => user.role === 'admin');
    guard = new Guard(reflector);
    context = {
      switchToHttp: () => (
        {
          getRequest: () => (
            { user: { role: 'admin' } }
          ),
        }
      ),
      getHandler: () => {
      },
    } as unknown as ExecutionContext;
  });

  it('should allow access if no policy handlers are defined', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if no ability predicate is defined', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true]);
    guard =
      new (
        AuthRegisterPoliciesGuardMixin(TestEntity, undefined)
      )(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if no user is present', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true, () => true]);
    context.switchToHttp =
      () => (
        {
          getRequest: () => (
            {}
          ),
        } as any
      );
    expect(() => guard.canActivate(context)).toThrow(new ForbiddenException('Forbidden resource'));
  });

  it('should allow access if all policy handlers return true', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true, () => true]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if any policy handler returns false', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true, () => false]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should execute policy handler if ability predicate does not match', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true]);
    context.switchToHttp =
      () => (
        {
          getRequest: () => (
            { user: { role: 'user' } }
          ),
        } as any
      );
    const spyPolicyHandler = jest.spyOn(guard, 'execPolicyHandler');
    guard.canActivate(context);

    expect(spyPolicyHandler).toHaveBeenCalledTimes(1);
  });

  it('should execute policy handler if ability predicate matches', () => {
    jest.spyOn(reflector, 'get').mockReturnValueOnce([() => true]);
    context.switchToHttp =
      () => (
        {
          getRequest: () => (
            { user: { role: 'superadmin' } }
          ),
        } as any
      );
    guard =
      new (
        AuthRegisterPoliciesGuardMixin(TestEntity, (user) => user.role === 'superadmin')
      )(reflector);
    const spyPolicyHandler = jest.spyOn(guard, 'execPolicyHandler');
    guard.canActivate(context);

    expect(spyPolicyHandler).toHaveBeenCalledTimes(1);
  });
});