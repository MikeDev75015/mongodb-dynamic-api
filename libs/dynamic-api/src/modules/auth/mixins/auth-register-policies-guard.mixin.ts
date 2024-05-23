import { ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { AuthAbilityPredicate, RegisterPoliciesGuardConstructor } from '../../../interfaces';
import { BaseEntity } from '../../../models';

function AuthRegisterPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: AuthAbilityPredicate | undefined,
): RegisterPoliciesGuardConstructor {
  @Injectable()
  class BaseAuthRegisterPoliciesGuard {
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;

    canActivate(context: ExecutionContext): boolean {
      let { user } = context.switchToHttp().getRequest();

      if (this.abilityPredicate && (
        !user || !this.abilityPredicate(user)
      )) {
        throw new ForbiddenException('Access denied');
      }

      return true;
    }
  }

  return BaseAuthRegisterPoliciesGuard;
}

export { AuthRegisterPoliciesGuardMixin };
