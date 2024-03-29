import { Body, Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyController, DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyControllerMixin<Entity extends BaseEntity>(
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
): DuplicateManyControllerConstructor<Entity> {
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

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(RouteBody, 'name', {
    value: CustomBody ? CustomBody.name : `DuplicateMany${displayedName}${addVersionSuffix(version)}Dto`,
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
    'DuplicateMany',
    entity,
    version,
    description,
    isPublic,
    {
      param: undefined,
      query: undefined,
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class DuplicateManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseDuplicateManyController implements DuplicateManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DuplicateManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DuplicateManyPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async duplicateMany(@Query('ids') ids: string[], @Body() body?: RouteBody) {
      return this.service.duplicateMany(ids, body as any);
    }
  }

  Object.defineProperty(BaseDuplicateManyController, 'name', {
    value: `BaseDuplicateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDuplicateManyController;
}

export { DuplicateManyControllerMixin };
