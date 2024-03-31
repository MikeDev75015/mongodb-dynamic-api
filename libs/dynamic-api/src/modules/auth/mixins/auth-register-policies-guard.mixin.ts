import { AbilityBuilder, ExtractSubjectType, PureAbility } from '@casl/ability';
import { ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from '../../../decorators';
import {
  AppAbility,
  RegisterAbilityPredicate,
  PoliciesGuardConstructor,
  PolicyHandler,
  RouteType,
} from '../../../interfaces';
import { BaseEntity } from '../../../models';

const registerRouteType = 'register' as RouteType;

function AuthRegisterPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: RegisterAbilityPredicate | undefined,
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class BaseAuthRegisterPoliciesGuard {
    protected entity = entity;

    protected abilityPredicate = abilityPredicate;

    constructor(protected readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const policyHandlers = this.reflector.get<PolicyHandler<Entity>[]>(CHECK_POLICIES_KEY, context.getHandler());
      if (!policyHandlers || !this.abilityPredicate) {
        return true;
      }

      let { user } = context.switchToHttp().getRequest();
      if (!user) {
        throw new ForbiddenException('Forbidden resource');
      }

      const { can, build } = new AbilityBuilder<AppAbility<Entity>>(PureAbility);

      can(registerRouteType, entity, abilityPredicate);

      const ability = build({
        detectSubjectType: (object: Entity) => object.constructor as ExtractSubjectType<Type<Entity>>,
      });

      return policyHandlers.every((handler) => {
        return this.execPolicyHandler(handler, ability);
      });
    }

    private execPolicyHandler(handler: PolicyHandler<Entity>, ability: AppAbility<Entity>) {
      if (typeof handler === 'function') {
        return handler(ability);
      }
      return handler.handle(ability);
    }
  }

  return BaseAuthRegisterPoliciesGuard;
}

export { AuthRegisterPoliciesGuardMixin, registerRouteType };
