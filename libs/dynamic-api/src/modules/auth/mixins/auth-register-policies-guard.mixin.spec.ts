import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BaseEntity } from '../../../models';
import { AuthRegisterPoliciesGuardMixin } from './auth-register-policies-guard.mixin';

describe('AuthRegisterPoliciesGuardMixin', () => {
  let guard;
  let context: ExecutionContext;
  let user;

  class User extends BaseEntity {
    isAdmin: boolean;

    constructor(isAdmin = false) {
      super();

      this.isAdmin = isAdmin;
    }
  }

  beforeEach(async () => {
    class AuthRegisterPoliciesGuard extends AuthRegisterPoliciesGuardMixin(User, undefined) {}

    guard = new AuthRegisterPoliciesGuard({} as any);
    context = { switchToHttp: () => ({ getRequest: () => ({ user }) } as any) } as ExecutionContext;
  });

  describe('canActivate', () => {
    describe('without abilityPredicate', () => {
      it('should allow access if user exists', () => {
        user = {};
        expect(() => guard.canActivate(context)).not.toThrow();
      });

      it('should allow access if user does not exist', () => {
        user = null;
        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });

    describe('with abilityPredicate', () => {
      beforeEach(() => {
        guard.abilityPredicate = (user) => user.isAdmin;
      });

      it('should deny access if user does not exist', () => {
        user = null;
        expect(() => guard.canActivate(context)).toThrow(new ForbiddenException('Access denied'));
      });

      it('should deny access if user exists and abilityPredicate returns false', () => {
        user = new User(false);
        expect(() => guard.canActivate(context)).toThrow(new ForbiddenException('Access denied'));
      });

      it('should allow access if user exists and abilityPredicate returns true', () => {
        user = new User(true);
        expect(() => guard.canActivate(context)).not.toThrow();
      });
    });
  });
});