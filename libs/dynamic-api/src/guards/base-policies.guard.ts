import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityBuilder } from '../builders';
import { CHECK_POLICIES_KEY } from '../decorators';
import { AppAbility, DynamicApiRouteCaslAbilityPredicate, PolicyHandler, RouteType } from '../interfaces';
import { BaseEntity } from '../models';

export abstract class BasePoliciesGuard<Entity extends BaseEntity> implements CanActivate {
  protected routeType: RouteType;
  protected entity: Type<Entity>;
  protected abilityPredicate: DynamicApiRouteCaslAbilityPredicate<Entity> | undefined;

  protected constructor(protected readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers = this.reflector.get<PolicyHandler<Entity>[]>(CHECK_POLICIES_KEY, context.getHandler());
    if (!policyHandlers || !this.abilityPredicate) {
      return true;
    }

    let { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Forbidden resource');
    }

    const ability = CaslAbilityBuilder(this.entity, this.routeType, this.abilityPredicate, user);

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