import { Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BasePoliciesGuard } from '../guards';
import { addVersionSuffix } from '../helpers';
import {
  DynamicApiRouteCaslAbilityPredicate,
  PoliciesGuard,
  PoliciesGuardConstructor,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

function CreatePoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  version: string | undefined,
  abilityPredicate: DynamicApiRouteCaslAbilityPredicate<Entity> | undefined,
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity> implements PoliciesGuard<Entity> {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: DynamicApiRouteCaslAbilityPredicate<Entity> | undefined = abilityPredicate;

    constructor(protected readonly reflector: Reflector) {
      super(reflector);
    }
  }

  Object.defineProperty(RoutePoliciesGuard, 'name', {
    value: `${routeType}${entity.name}${addVersionSuffix(version)}PoliciesGuard`,
    writable: false,
  });

  return RoutePoliciesGuard;
}

export { CreatePoliciesGuardMixin };
