import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAbility, PolicyHandler, RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { BasePoliciesGuard } from './base-policies.guard';

jest.mock('@casl/ability', () => {
  class AbilityBuilderMock {
    can = jest.fn();

    build = jest.fn().mockReturnValue({} as AppAbility<any>);
  }

  return { AbilityBuilder: AbilityBuilderMock };
});

describe('BasePoliciesGuard', () => {
  class Test extends BaseEntity {}

  const entity = Test;
  const routeType: RouteType = 'GetMany';

  class User {
    readonly isAdmin: boolean;

    constructor(isAdmin: boolean) {
      this.isAdmin = isAdmin;
    }
  }

  const abilityPredicate = <Entity>(entity: Entity, user: User) => user.isAdmin;

  const fakePolicyHandlers = {
    every: jest.fn().mockReturnValue(false),
  } as unknown as PolicyHandler<any>[];

  describe('canActivate', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      context = {
        getHandler: jest.fn().mockReturnValue(undefined),
        switchToHttp: jest.fn(),
      } as unknown as ExecutionContext;
    });

    it('should return true if policyHandlers is not defined', () => {
      class TestPoliciesGuard extends BasePoliciesGuard<BaseEntity> {
        protected abilityPredicate = abilityPredicate;

        protected entity = entity;

        protected routeType = routeType;

        constructor(reflector: Reflector) {
          super(reflector);
        }
      }

      const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
      const guard = new TestPoliciesGuard(reflector);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if abilityPredicate is not defined', () => {
      class TestPoliciesGuard extends BasePoliciesGuard<BaseEntity> {
        protected abilityPredicate = undefined;

        protected entity = entity;

        protected routeType = routeType;

        constructor(reflector: Reflector) {
          super(reflector);
        }
      }

      const reflector = { get: jest.fn().mockReturnValue([]) } as unknown as Reflector;
      const guard = new TestPoliciesGuard(reflector);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw an UnauthorizedException', () => {
      class TestPoliciesGuard extends BasePoliciesGuard<BaseEntity> {
        protected abilityPredicate = abilityPredicate;

        protected entity = entity;

        protected routeType = routeType;

        constructor(reflector: Reflector) {
          super(reflector);
        }
      }

      const reflector = { get: jest.fn().mockReturnValue([]) } as unknown as Reflector;
      const guard = new TestPoliciesGuard(reflector);
      context.switchToHttp = jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue({ user: undefined }) });

      expect(() => guard.canActivate(context))
      .toThrow(new ForbiddenException('Forbidden resource'));
    });

    it('should return true if user has ability', () => {
      class TestPoliciesGuard extends BasePoliciesGuard<BaseEntity> {
        protected abilityPredicate = abilityPredicate;

        protected entity = entity;

        protected routeType = routeType;

        constructor(reflector: Reflector) {
          super(reflector);
        }
      }

      const reflector = { get: jest.fn().mockReturnValue([]) } as unknown as Reflector;
      const guard = new TestPoliciesGuard(reflector);
      const user = new User(true);
      context.switchToHttp = jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue({ user }) });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if user does not have ability', () => {
      class TestPoliciesGuard extends BasePoliciesGuard<BaseEntity> {
        protected abilityPredicate = abilityPredicate;

        protected entity = entity;

        protected routeType = routeType;

        constructor(reflector: Reflector) {
          super(reflector);
        }
      }

      const reflector = { get: jest.fn().mockReturnValue(fakePolicyHandlers) } as unknown as Reflector;
      const guard = new TestPoliciesGuard(reflector);
      const user = new User(false);
      context.switchToHttp = jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue({ user }) });

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
