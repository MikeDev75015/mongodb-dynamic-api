import { Injectable, Type } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DynamicApiModule } from '../dynamic-api.module';
import { BasePoliciesGuard } from '../guards';
import { provideName } from '../helpers';
import {
  AbilityPredicate,
  PoliciesGuard,
  PoliciesGuardConstructor,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

function CreatePoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  version: string | undefined,
  abilityPredicate: AbilityPredicate<Entity> | undefined,
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity> implements PoliciesGuard {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: AbilityPredicate<Entity> | undefined = abilityPredicate;

    constructor(
      @InjectModel(
        entity.name,
        DynamicApiModule.state.get('connectionName'),
      )
      protected readonly model: Model<Entity>,
    ) {
      super(model);
    }
  }

  Object.defineProperty(RoutePoliciesGuard, 'name', {
    value: `${provideName(routeType, entity.name, version, 'PoliciesGuard')}`,
    writable: false,
  });

  return RoutePoliciesGuard;
}

export { CreatePoliciesGuardMixin };
