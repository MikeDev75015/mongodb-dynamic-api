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
  PredicateBehavior,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function RoutePoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  abilityPredicate: AbilityPredicate<Entity> | undefined,
  queryToPipeline?: (query: unknown) => PipelineStage[],
  predicateBehavior?: PredicateBehavior,
): PoliciesGuardConstructor<Entity> {
  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity> implements PoliciesGuard {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: AbilityPredicate<Entity> | undefined = abilityPredicate;
    protected predicateBehavior: PredicateBehavior | undefined = predicateBehavior;
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

interface SocketPoliciesGuardMixinOptions {
  abilityPredicate?: AuthAbilityPredicate;
  isPublic?: boolean;
  queryToPipeline?: (query: unknown) => PipelineStage[];
  predicateBehavior?: PredicateBehavior;
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function SocketPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  event: string,
  version: string | undefined,
  options: SocketPoliciesGuardMixinOptions = {},
): PoliciesGuardConstructor<Entity> {
  const { abilityPredicate, isPublic, queryToPipeline, predicateBehavior } = options;

  @Injectable()
  class SocketPoliciesGuard extends BaseSocketPoliciesGuard<Entity> {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;
    protected predicateBehavior: PredicateBehavior | undefined = predicateBehavior;
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
