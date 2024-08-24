import { Body, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { getControllerMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateManyController, CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyService } from './create-many-service.interface';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
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
    routeConfig.subPath,
    version,
    description,
    isPublic,
    {
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  class CreateManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateManyController implements CreateManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateManyService<Entity>,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateManyPoliciesGuard)
    // @ts-ignore
    async createMany(@Body() body: RouteBody) {
      return this.service.createMany(body.list as unknown as Partial<Entity>[]);
    }
  }

  Object.defineProperty(BaseCreateManyController, 'name', {
    value: `Base${provideName('CreateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
