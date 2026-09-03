import { BadRequestException, Optional, Query, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { ManyEntityQuery } from '../../dtos/many-entity.query';
import { DeletePresenter } from '../../dtos/delete.presenter';
import { addVersionSuffix } from '../../helpers/versioning-config.helper';
import { getMixinData } from '../../helpers/mixin-data.helper';
import { provideName } from '../../helpers/format.helper';
import { RouteDecoratorsHelper } from '../../helpers/route-decorators.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
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
    false,
    broadcastConfig,
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
    async deleteMany(@Query() { ids }: ManyEntityQuery, @Request() req?: DynamicApiRequest) {
      if (!ids?.length) {
        throw new BadRequestException('Invalid query');
      }

      const deleteResult = await this.service.deleteMany(ids, req?.user);

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
