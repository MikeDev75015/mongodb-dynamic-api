import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityParam, EntityQuery } from '../../dtos';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetOneController, GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneControllerMixin<Entity extends BaseEntity>(
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
): GetOneControllerConstructor<Entity> {
  const displayedName = getFormattedApiTag(apiTag, entity.name);
  const {
    query: CustomQuery,
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
    value: `GetOne${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  class RouteQuery extends (
    CustomQuery ?? EntityQuery
  ) {}

  Object.defineProperty(RouteQuery, 'name', {
    value: CustomQuery ? CustomQuery.name : `GetOne${displayedName}${addVersionSuffix(version)}Query`,
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
    'GetOne',
    entity,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      query: RouteQuery,
      body: undefined,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class GetOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseGetOneController implements GetOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async getOne(@Param('id') id: string) {
      return this.service.getOne(id);
    }
  }

  Object.defineProperty(BaseGetOneController, 'name', {
    value: `BaseGetOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseGetOneController;
}

export { GetOneControllerMixin };
