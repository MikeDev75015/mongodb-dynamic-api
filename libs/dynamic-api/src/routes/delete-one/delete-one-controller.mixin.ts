import { Param, Type, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RouteDecoratorsBuilder } from '../../builders';
import { DeletePresenter } from '../../dtos';
import { getControllerMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteOneController, DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneService } from './delete-one-service.interface';

function DeleteOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteOneControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    EntityParam,
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

  class DeleteOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteOneController implements DeleteOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteOnePoliciesGuard)
    async deleteOne(@Param('id') id: string) {
      const result = await this.service.deleteOne(id);
      return plainToInstance(DeletePresenter, result);
    }
  }

  Object.defineProperty(BaseDeleteOneController, 'name', {
    value: `Base${provideName('DeleteOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDeleteOneController;
}

export { DeleteOneControllerMixin };
