import { Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityQuery } from '../../dtos';
import { addVersionSuffix, getFormattedApiTag, RouteDecoratorsHelper } from '../../helpers';
import { getControllerMixinData } from '../../helpers/controller-mixin.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetManyController, GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetManyControllerConstructor<Entity> {
  const {
    routeType,
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

  class RouteQuery extends (
    routeConfig.dTOs?.query ?? EntityQuery
  ) {}

  Object.defineProperty(RouteQuery, 'name', {
    value: `${routeType}${getFormattedApiTag(controllerOptions.apiTag, entity.name)}${addVersionSuffix(version)}Query`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    version,
    description,
    isPublic,
    {
      presenter: RoutePresenter,
    },
  );

  class GetManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseGetManyController implements GetManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetManyPoliciesGuard)
    async getMany(@Query() query: RouteQuery) {
      return this.service.getMany(query);
    }
  }

  Object.defineProperty(BaseGetManyController, 'name', {
    value: `Base${routeType}${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseGetManyController;
}

export { GetManyControllerMixin };
