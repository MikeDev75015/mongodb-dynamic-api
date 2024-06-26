import { Query, Type, UseGuards } from '@nestjs/common';
import { Builder } from 'builder-pattern';
import { RouteDecoratorsBuilder } from '../../builders';
import { DeleteManyEntityQuery, DeletePresenter } from '../../dtos';
import { getControllerMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteManyController, DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyService } from './delete-many-service.interface';

function DeleteManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteManyControllerConstructor<Entity> {
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

  class DeleteManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteManyController implements DeleteManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteManyPoliciesGuard)
    async deleteMany(@Query() { ids }: DeleteManyEntityQuery) {
      const result = await this.service.deleteMany(ids);
      return Builder(DeletePresenter, result).build();
    }
  }

  Object.defineProperty(BaseDeleteManyController, 'name', {
    value: `Base${provideName('DeleteMany', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return BaseDeleteManyController;
}

export { DeleteManyControllerMixin };
