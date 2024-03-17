import { Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityQuery } from '../../dtos';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetManyController, GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyControllerMixin<Entity extends BaseEntity>(
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
): GetManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { query: CustomQuery, presenter: CustomPresenter } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  class RouteQuery extends (
    CustomQuery ?? EntityQuery
  ) {}

  if (!CustomQuery) {
    Object.defineProperty(RouteQuery, 'name', {
      value: `${routeType}${displayedName}${addVersionSuffix(version)}Query`,
      writable: false,
    });
  }

  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}${addVersionSuffix(version)}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    version,
    description,
    isPublic,
    {
      param: undefined,
      query: RouteQuery,
      body: undefined,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class GetManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseGetManyController implements GetManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetManyPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async getMany(@Query() query: RouteQuery) {
      return this.service.getMany(query);
    }
  }

  Object.defineProperty(BaseGetManyController, 'name', {
    value: `Base${routeType}${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseGetManyController;
}

export { GetManyControllerMixin };
