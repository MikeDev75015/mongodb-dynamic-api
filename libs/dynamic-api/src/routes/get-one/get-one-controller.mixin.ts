import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { getControllerMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetOneController, GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetOneControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
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
      param: EntityParam,
      presenter: RoutePresenter,
    },
  );

  class GetOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseGetOneController implements GetOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetOnePoliciesGuard)
    async getOne(@Param('id') id: string) {
      return this.service.getOne(id);
    }
  }

  Object.defineProperty(BaseGetOneController, 'name', {
    value: `Base${provideName('GetOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseGetOneController;
}

export { GetOneControllerMixin };
