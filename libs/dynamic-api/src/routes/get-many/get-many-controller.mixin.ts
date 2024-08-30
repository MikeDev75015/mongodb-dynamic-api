import { Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityQuery } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetManyController, GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetManyControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
  );

  class GetManyQuery extends (dTOs?.query ?? EntityQuery) {}

  Object.defineProperty(GetManyQuery, 'name', {
    value: `GetMany${displayedName}${addVersionSuffix(version)}Query`,
    writable: false,
  });

  class GetManyPresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(GetManyPresenter, 'name', {
    value: dTOs?.presenter
      ? `GetMany${displayedName}${addVersionSuffix(version)}Presenter`
      : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    routeConfig.subPath,
    version,
    description,
    isPublic,
    {
      presenter: GetManyPresenter,
    },
  );

  class GetManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  Object.defineProperty(GetManyPoliciesGuard, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}PoliciesGuard`,
    writable: false,
  });

  class BaseGetManyController implements GetManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetManyPoliciesGuard)
    async getMany(@Query() query: GetManyQuery) {
      const list = await this.service.getMany(query ?? {});

      const fromEntities = (
        GetManyPresenter as Mappable<Entity>
      ).fromEntities;

      return fromEntities ? fromEntities<GetManyPresenter>(list) : list;
    }
  }

  Object.defineProperty(BaseGetManyController, 'name', {
    value: `Base${provideName('GetMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseGetManyController;
}

export { GetManyControllerMixin };
