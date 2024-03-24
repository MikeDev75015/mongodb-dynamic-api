import { Body, Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { ReplaceOneController, ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  {
    path,
    apiTag,
    isPublic: isPublicController,
    abilityPredicates: controllerAbilityPredicates,
  }: DynamicApiControllerOptions<Entity>,
  {
    type: routeType,
    description,
    dTOs,
    isPublic: isPublicRoute,
    abilityPredicate: routeAbilityPredicate,
  }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): ReplaceOneControllerConstructor<Entity> {
  const displayedName = getFormattedApiTag(apiTag, entity.name);
  const {
    body: CustomBody,
    presenter: CustomPresenter,
  } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  Object.defineProperty(EntityParam, 'name', {
    value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity)
  ) {}

  Object.defineProperty(RouteBody, 'name', {
    value: CustomBody ? CustomBody.name : `ReplaceOne${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(RoutePresenter, 'name', {
    value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'ReplaceOne',
    entity,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      query: undefined,
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class ReplaceOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseReplaceOneController implements ReplaceOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: ReplaceOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(ReplaceOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async replaceOne(@Param('id') id: string, @Body() body: RouteBody) {
      return this.service.replaceOne(id, body as any);
    }
  }

  Object.defineProperty(BaseReplaceOneController, 'name', {
    value: `BaseReplaceOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseReplaceOneController;
}

export { ReplaceOneControllerMixin };
