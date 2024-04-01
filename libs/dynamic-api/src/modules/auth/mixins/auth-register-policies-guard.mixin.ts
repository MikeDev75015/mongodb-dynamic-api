import { ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { PoliciesGuardConstructor, RegisterAbilityPredicate } from '../../../interfaces';
import { BaseEntity } from '../../../models';

function AuthRegisterPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: RegisterAbilityPredicate | undefined,
): PoliciesGuardConstructor<Entity> {
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
