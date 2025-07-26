import { Injectable, Type } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { DynamicApiModule } from '../dynamic-api.module';
import { BasePoliciesGuard, BaseSocketPoliciesGuard } from '../guards';
import { pascalCase, provideName } from '../helpers';
import {
  AbilityPredicate, AuthAbilityPredicate,
  PoliciesGuard,
  PoliciesGuardConstructor,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

function RoutePoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  abilityPredicate: AbilityPredicate<Entity> | undefined,
  queryToPipeline?: (query: unknown) => PipelineStage[],
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity> implements PoliciesGuard {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: AbilityPredicate<Entity> | undefined = abilityPredicate;
    protected queryToPipeline = queryToPipeline;

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
    value: `${provideName(routeType, displayedName, version, 'PoliciesGuard')}`,
    writable: false,
  });

  return RoutePoliciesGuard;
}

function SocketPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  event: string,
  version: string | undefined,
  abilityPredicate: AuthAbilityPredicate | undefined,
  isPublic: boolean | undefined,
  queryToPipeline?: (query: unknown) => PipelineStage[],
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class SocketPoliciesGuard extends BaseSocketPoliciesGuard<Entity> {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;
    protected queryToPipeline = queryToPipeline;
    protected isPublic = isPublic;

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

  Object.defineProperty(SocketPoliciesGuard, 'name', {
    value: `${provideName(routeType, pascalCase(event), version, 'SocketPoliciesGuard')}`,
    writable: false,
  });

  return SocketPoliciesGuard;
}

export { RoutePoliciesGuardMixin, SocketPoliciesGuardMixin };
