import { Optional, Query, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { ManyEntityQuery, DeletePresenter } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DeleteManyController, DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyService } from './delete-many-service.interface';

function DeleteManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteManyControllerConstructor<Entity> {
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

  class DeleteManyPresenter extends (dTOs?.presenter ?? DeletePresenter) {}

  Object.defineProperty(DeleteManyPresenter, 'name', {
    value: dTOs?.presenter
      ? `DeleteMany${displayedName}${addVersionSuffix(version)}Presenter`
      : `DeleteResultPresenter`,
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
      presenter: DeleteManyPresenter,
    },
  );

  class DeleteManyPoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteManyController implements DeleteManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DeleteManyService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async deleteMany(@Query() { ids }: ManyEntityQuery) {
      if (!ids?.length) {
        throw new Error('Invalid query');
      }

      const deleteResult = await this.service.deleteMany(ids);

      const fromDeleteResult = (
        DeleteManyPresenter as Mappable<Entity>
      ).fromDeleteResult;

      const responseData = fromDeleteResult ? fromDeleteResult<DeleteManyPresenter>(deleteResult) : deleteResult;

      this.broadcastService?.broadcastFromHttp(event, ids.map(id => ({ id })), broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseDeleteManyController, 'name', {
    value: `Base${provideName('DeleteMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDeleteManyController;
}

export { DeleteManyControllerMixin };
