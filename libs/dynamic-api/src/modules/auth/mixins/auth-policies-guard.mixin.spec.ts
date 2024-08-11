import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ExtendedSocket, PoliciesGuard } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { AuthPoliciesGuardMixin, AuthSocketPoliciesGuardMixin } from './auth-policies-guard.mixin';

describe('AuthPoliciesGuardMixin', () => {
  let user: any;
  let guard: any;
  let context: ExecutionContext;

  class User extends BaseEntity {
    isAdmin: boolean;

    constructor(isAdmin = false) {
      super();

      this.isAdmin = isAdmin;
    }
  }

  beforeEach(async () => {
    class AuthPoliciesGuard extends AuthPoliciesGuardMixin(User, undefined) {}

    guard = new AuthPoliciesGuard();
    context =
      {
        switchToHttp: () => (
          {
            getRequest: () => (
              { user }
            ),
          } as any
        ),
      } as ExecutionContext;
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
        guard.abilityPredicate = (user: User) => user.isAdmin;
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

describe('AuthSocketPoliciesGuardMixin', () => {
  class User extends BaseEntity {
    isAdmin: boolean;

    constructor(isAdmin = false) {
      super();

      this.isAdmin = isAdmin;
    }
  }

  let guard: PoliciesGuard;
  let context: ExecutionContext;
  let socket: ExtendedSocket<User>;
  let user: User;

  beforeEach(async () => {
    class AuthSocketPoliciesGuard extends AuthSocketPoliciesGuardMixin(User, undefined) {}

    guard = new AuthSocketPoliciesGuard();
    socket = {
      handshake: {
        query: {},
      },
    } as ExtendedSocket<User>;
    context = { getArgs: jest.fn(() => [socket]) } as unknown as ExecutionContext;
  });

  describe('canActivate', () => {
    describe('without abilityPredicate', () => {
      it('should allow access', async () => {
        await expect(guard.canActivate(context)).resolves.not.toThrow();
      });
    });

    describe('with abilityPredicate', () => {
      beforeEach(() => {
        guard['abilityPredicate'] = (user: User) => user.isAdmin;
      });

      it('should throw a ws exception if accessToken is missing', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
      });

      it('should throw a ws exception if user does not exists', async () => {
        jest.spyOn<any, any>(guard, 'extractUserFromToken').mockResolvedValueOnce(undefined);
        jest.spyOn<any, any>(guard, 'getAccessTokenFromSocketQuery').mockReturnValueOnce('token');

        await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Access denied'));
      });

      it('should throw a ws exception if user exists and abilityPredicate returns false', async () => {
        user = new User(false);
        jest.spyOn<any, any>(guard, 'extractUserFromToken').mockResolvedValueOnce(user);
        jest.spyOn<any, any>(guard, 'getAccessTokenFromSocketQuery').mockReturnValueOnce('token');

        await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Access denied'));
      });

      it('should allow access if user exists and abilityPredicate returns true', async () => {
        user = new User(true);
        jest.spyOn<any, any>(guard, 'extractUserFromToken').mockResolvedValueOnce(user);
        jest.spyOn<any, any>(guard, 'getAccessTokenFromSocketQuery').mockReturnValueOnce('token');

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(socket.user).toBe(user);
      });
    });
  });
});