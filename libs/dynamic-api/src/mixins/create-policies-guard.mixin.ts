import { Inject, Injectable, Type } from '@nestjs/common';
import { BasePoliciesGuard } from '../guards';
import { provideName } from '../helpers';
import {
  AbilityPredicate,
  PoliciesGuard,
  PoliciesGuardConstructor,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';
import { BaseService } from '../services';

function CreatePoliciesGuardMixin<Entity extends BaseEntity, Service extends BaseService<Entity>>(
  entity: Type<Entity>,
  routeType: RouteType,
  version: string | undefined,
  abilityPredicate: AbilityPredicate<Entity> | undefined,
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity, Service> implements PoliciesGuard<Entity> {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: AbilityPredicate<Entity> | undefined = abilityPredicate;

    constructor(
      @Inject(`${provideName(routeType, entity.name, version, 'Service')}`)
      protected readonly service: Service,
    ) {
      super(service);
    }
  }

  Object.defineProperty(RoutePoliciesGuard, 'name', {
    value: `${provideName(routeType, entity.name, version, 'PoliciesGuard')}`,
    writable: false,
  });

  return RoutePoliciesGuard;
}

export { CreatePoliciesGuardMixin };
