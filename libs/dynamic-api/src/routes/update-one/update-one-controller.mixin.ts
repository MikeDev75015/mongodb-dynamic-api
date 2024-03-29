import { Body, Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateOneController, UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneService } from './update-one-service.interface';

function UpdateOneControllerMixin<Entity extends BaseEntity>(
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
): UpdateOneControllerConstructor<Entity> {
  const displayedName = getFormattedApiTag(apiTag, entity.name);
  const {
    body: CustomBody,
    param: CustomParam,
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

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  Object.defineProperty(RouteParam, 'name', {
    value: CustomParam ? CustomParam.name : `UpdateOne${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(RouteBody, 'name', {
    value: CustomBody ? CustomBody.name : `UpdateOne${displayedName}${addVersionSuffix(version)}Dto`,
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
    'UpdateOne',
    entity,
    version,
    description,
    isPublic,
    {
      param: RouteParam,
      query: undefined,
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class UpdateOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseUpdateOneController implements UpdateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: UpdateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(UpdateOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async updateOne(@Param('id') id: string, @Body() body: RouteBody) {
      return this.service.updateOne(id, body as any);
    }
  }

  Object.defineProperty(BaseUpdateOneController, 'name', {
    value: `BaseUpdateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseUpdateOneController;
}

export { UpdateOneControllerMixin };
