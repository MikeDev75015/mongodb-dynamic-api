import { Injectable, Type } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { DynamicApiModule } from '../dynamic-api.module';
import { BasePoliciesGuard, BaseSocketPoliciesGuard } from '../guards';
import { pascalCase, provideName } from '../helpers/format.helper';
import {
  AbilityPredicate, AuthAbilityPredicate,
  PredicateBehavior,
  RouteType,
} from '../interfaces';
import { PoliciesGuard, PoliciesGuardConstructor } from '../interfaces/dynamic-api-policy-handler.interface';
import { BaseEntity } from '../models';

interface RoutePoliciesGuardMixinOptions {
  queryToPipeline?: (query: unknown) => PipelineStage[];
  predicateBehavior?: PredicateBehavior;
  /** @see CustomRouteConfig.targetParam */
  targetParam?: string;
  /** @see CustomRouteConfig.authAbilityPredicate */
  authAbilityPredicate?: AuthAbilityPredicate<unknown>;
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function RoutePoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  abilityPredicate: AbilityPredicate<Entity> | undefined,
  options: RoutePoliciesGuardMixinOptions = {},
): PoliciesGuardConstructor<Entity> {
  const { queryToPipeline, predicateBehavior, targetParam, authAbilityPredicate } = options;

  @Injectable()
  class RoutePoliciesGuard extends BasePoliciesGuard<Entity> implements PoliciesGuard {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate: AbilityPredicate<Entity> | undefined = abilityPredicate;
    protected authAbilityPredicate: AuthAbilityPredicate<unknown> | undefined = authAbilityPredicate;
    protected predicateBehavior: PredicateBehavior | undefined = predicateBehavior;
    protected queryToPipeline = queryToPipeline;
    protected targetParam = targetParam;

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
  /** @see CustomRouteConfig.authAbilityPredicate */
  authAbilityPredicate?: AuthAbilityPredicate<unknown>;
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function SocketPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  event: string,
  version: string | undefined,
  options: SocketPoliciesGuardMixinOptions = {},
): PoliciesGuardConstructor<Entity> {
  const { abilityPredicate, isPublic, queryToPipeline, predicateBehavior, authAbilityPredicate } = options;

  @Injectable()
  class SocketPoliciesGuard extends BaseSocketPoliciesGuard<Entity> {
    protected routeType = routeType;
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;
    protected authAbilityPredicate: AuthAbilityPredicate<unknown> | undefined = authAbilityPredicate;
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
