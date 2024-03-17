import { Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteManyController, DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyService } from './delete-many-service.interface';
import { DeleteManyPresenter } from './delete-many.presenter';

function DeleteManyControllerMixin<Entity extends BaseEntity>(
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
): DeleteManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { presenter: CustomPresenter } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  class RoutePresenter extends (
    CustomPresenter ?? DeleteManyPresenter
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `DeleteMany${displayedName}${addVersionSuffix(version)}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'DeleteMany',
    entity,
    version,
    description,
    isPublic,
    {
      param: undefined,
      query: undefined,
      body: undefined,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class DeleteManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteManyController implements DeleteManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteManyPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async deleteMany(@Query('ids') ids: string[]) {
      return this.service.deleteMany(ids);
    }
  }

  Object.defineProperty(BaseDeleteManyController, 'name', {
    value: `BaseDeleteMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDeleteManyController;
}

export { DeleteManyControllerMixin };
