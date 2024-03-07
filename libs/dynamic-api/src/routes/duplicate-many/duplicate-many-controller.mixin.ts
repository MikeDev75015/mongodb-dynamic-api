import { Body, Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyController, DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  { path, apiTag, abilityPredicates: controllerAbilityPredicates }: ControllerOptions<Entity>,
  {
    type: routeType,
    description,
    dTOs,
    abilityPredicate: routeAbilityPredicate,
  }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const {
    body: CustomBody,
    presenter: CustomPresenter,
  } = dTOs ?? {};

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, true)
  ) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `DuplicateMany${displayedName}${addVersionSuffix(version)}Dto`,
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
    'DuplicateMany',
    entity,
    version,
    description,
    undefined,
    undefined,
    RouteBody,
    RoutePresenter,
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
