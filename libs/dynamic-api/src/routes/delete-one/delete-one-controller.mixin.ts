import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteOneController, DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneService } from './delete-one-service.interface';
import { DeleteOnePresenter } from './delete-one.presenter';

function DeleteOneControllerMixin<Entity extends BaseEntity>(
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
): DeleteOneControllerConstructor<Entity> {
  const displayedName = getFormattedApiTag(apiTag, entity.name);
  const { presenter: CustomPresenter } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  Object.defineProperty(EntityParam, 'name', {
    value: `DeleteOne${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  class RoutePresenter extends (
    CustomPresenter ?? DeleteOnePresenter
  ) {}

  Object.defineProperty(RoutePresenter, 'name', {
    value: CustomPresenter ? CustomPresenter.name : `DeleteOne${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'DeleteOne',
    entity,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      query: undefined,
      body: undefined,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class DeleteOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteOneController implements DeleteOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async deleteOne(@Param('id') id: string) {
      return this.service.deleteOne(id);
    }
  }

  Object.defineProperty(BaseDeleteOneController, 'name', {
    value: `BaseDeleteOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDeleteOneController;
}

export { DeleteOneControllerMixin };
