import { ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthAbilityPredicate, AuthPoliciesGuardConstructor } from '../../../interfaces';
import { BaseEntity } from '../../../models';

function AuthPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: AuthAbilityPredicate | undefined,
): AuthPoliciesGuardConstructor {
  @Injectable()
  class BaseAuthPoliciesGuard {
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;

    canActivate(context: ExecutionContext): boolean {
      const { user } = context.switchToHttp().getRequest();

      if (this.abilityPredicate && (
        !user || !this.abilityPredicate(user)
      )) {
        throw new ForbiddenException('Access denied');
      }

      return true;
    }
  }

  return BaseAuthPoliciesGuard;
}

function AuthSocketPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: AuthAbilityPredicate | undefined,
): AuthPoliciesGuardConstructor {
  @Injectable()
  class BaseAuthSocketPoliciesGuard {
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;

    canActivate(context: ExecutionContext): boolean {
      const [socket] = context.getArgs();

      if (this.abilityPredicate && (
        !socket.user || !this.abilityPredicate(socket.user)
      )) {
        throw new WsException('Access denied');
      }

      return true;
    }
  }

  return BaseAuthSocketPoliciesGuard;
}

export { AuthPoliciesGuardMixin, AuthSocketPoliciesGuardMixin };
