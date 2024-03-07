import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityParam, EntityQuery } from '../../dtos';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetOneController, GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  { path, apiTag, abilityPredicates: controllerAbilityPredicates }: ControllerOptions<Entity>,
  {
    type: routeType,
    description,
    dTOs,
    abilityPredicate: routeAbilityPredicate,
  }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetOneControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const {
    param: CustomParam,
    query: CustomQuery,
    presenter: CustomPresenter,
  } = dTOs ?? {};

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `GetOne${displayedName}${addVersionSuffix(version)}Param`,
      writable: false,
    });
  }

  class RouteQuery extends (
    CustomQuery ?? EntityQuery
  ) {}

  if (!CustomQuery) {
    Object.defineProperty(RouteQuery, 'name', {
      value: `GetOne${displayedName}${addVersionSuffix(version)}Query`,
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
    'GetOne',
    entity,
    version,
    description,
    RouteParam,
    RouteQuery,
    undefined,
    RoutePresenter,
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
