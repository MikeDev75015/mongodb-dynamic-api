import { Body, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getControllerMixinData, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateOneController, CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateOneControllerConstructor<Entity> {
  const {
    routeType,
    description,
    isPublic,
    RouteBody,
    RoutePresenter,
    abilityPredicate,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    version,
    description,
    isPublic,
    {
      body: RouteBody,
      presenter: RoutePresenter,
    },
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
    // @ts-ignore
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
