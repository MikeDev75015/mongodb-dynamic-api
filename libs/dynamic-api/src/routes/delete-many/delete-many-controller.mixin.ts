import { Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { ManyEntityQuery, DeletePresenter } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteManyController, DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyService } from './delete-many-service.interface';

function DeleteManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteManyControllerConstructor<Entity> {
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

  class DeleteManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteManyController implements DeleteManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteManyPoliciesGuard)
    async deleteMany(@Query() { ids }: ManyEntityQuery) {
      const deleteResult = await this.service.deleteMany(ids);

      const fromDeleteResult = (
        DeleteManyPresenter as Mappable<Entity>
      ).fromDeleteResult;

      return fromDeleteResult ? fromDeleteResult<DeleteManyPresenter>(deleteResult) : deleteResult;
    }
  }

  Object.defineProperty(BaseDeleteManyController, 'name', {
    value: `Base${provideName('DeleteMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDeleteManyController;
}

export { DeleteManyControllerMixin };
