import { Optional, Param, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { DeletePresenter, EntityParam } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DeleteOneController, DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneService } from './delete-one-service.interface';

function DeleteOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteOneControllerConstructor<Entity> {
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
    false,
    broadcastConfig,
  );

  class DeleteOnePresenter extends (
    dTOs?.presenter ?? DeletePresenter
  ) {}

  Object.defineProperty(DeleteOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `DeleteOne${displayedName}${addVersionSuffix(version)}Presenter`
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
      param: EntityParam,
      presenter: DeleteOnePresenter,
    },
  );

  class DeleteOnePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteOneController implements DeleteOneController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DeleteOneService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async deleteOne(@Param('id') id: string, @Request() req?: DynamicApiRequest) {
      const deleteResult = await this.service.deleteOne(id, req?.user);

      const fromDeleteResult = (
        DeleteOnePresenter as Mappable<Entity>
      ).fromDeleteResult;

      const responseData = fromDeleteResult ? fromDeleteResult<DeleteOnePresenter>(deleteResult) : deleteResult;

      this.broadcastService?.broadcastFromHttp(event, [{ id } as Entity], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseDeleteOneController, 'name', {
    value: `Base${provideName('DeleteOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDeleteOneController;
}

export { DeleteOneControllerMixin };
