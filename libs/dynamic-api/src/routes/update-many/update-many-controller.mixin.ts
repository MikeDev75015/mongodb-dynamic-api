import { Body, Optional, Query, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getMixinData, isEmpty, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { UpdateManyController, UpdateManyControllerConstructor } from './update-many-controller.interface';
import { UpdateManyService } from './update-many-service.interface';

function UpdateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateManyControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
    event,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
  );

  class UpdateManyBody extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(UpdateManyBody, 'name', {
    value: `UpdateMany${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class UpdateManyPresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(UpdateManyPresenter, 'name', {
    value: dTOs?.presenter
      ? `UpdateMany${displayedName}${addVersionSuffix(version)}Presenter`
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
      body: UpdateManyBody,
      presenter: UpdateManyPresenter,
    },
  );

  class UpdateManyPoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseUpdateManyController implements UpdateManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: UpdateManyService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(UpdateManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async updateMany(@Query('ids') ids: string[], @Body() body: UpdateManyBody) {
      if (!ids?.length) {
        throw new Error('Invalid query');
      }

      if (isEmpty(body)) {
        throw new Error('Invalid request body');
      }

      const toEntity = (
        UpdateManyBody as Mappable<Entity>
      ).toEntity;

      const list = await this.service.updateMany(ids, toEntity ? toEntity(body) : body as Partial<Entity>);

      const fromEntities = (
        UpdateManyPresenter as Mappable<Entity>
      ).fromEntities;

      const responseData = fromEntities ? fromEntities<UpdateManyPresenter>(list) : list;

      this.broadcastService?.broadcastFromHttp(event, responseData as object[], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseUpdateManyController, 'name', {
    value: `Base${provideName('UpdateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseUpdateManyController;
}

export { UpdateManyControllerMixin };
