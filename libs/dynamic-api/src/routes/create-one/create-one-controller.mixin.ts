import { Body, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateOneController, CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneControllerMixin<Entity extends BaseEntity>(
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
): CreateOneControllerConstructor<Entity> {
  const displayedName = getFormattedApiTag(apiTag, entity.name);
  const { body: CustomBody, presenter: CustomPresenter } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity)
  ) {}

  Object.defineProperty(RouteBody, 'name', {
    value: CustomBody ? CustomBody.name : `CreateOne${displayedName}${addVersionSuffix(version)}Dto`,
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
    'CreateOne',
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

  class CreateOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateOneController implements CreateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: CreateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async createOne(@Body() body: RouteBody) {
      return this.service.createOne(body as unknown as Partial<Entity>);
    }
  }

  Object.defineProperty(BaseCreateOneController, 'name', {
    value: `BaseCreateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseCreateOneController;
}

export { CreateOneControllerMixin };
