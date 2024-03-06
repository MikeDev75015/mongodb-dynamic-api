import { Query, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyController, DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyService } from './delete-many-service.interface';
import { DeleteManyPresenter } from './delete-many.presenter';

function DeleteManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): DeleteManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { presenter: CustomPresenter } = DTOs ?? {};

  class RoutePresenter extends (
    CustomPresenter ?? DeleteManyPresenter
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `DeleteMany${displayedName}${addVersionSuffix(version)}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'DeleteMany',
    entity,
    version,
    description,
    undefined,
    undefined,
    undefined,
    RoutePresenter,
  );

  class BaseDeleteManyController<Entity extends BaseEntity>
    implements DeleteManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async deleteMany(@Query('ids') ids: string[]) {
      return this.service.deleteMany(ids);
    }
  }

  Object.defineProperty(BaseDeleteManyController, 'name', {
    value: `BaseDeleteMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDeleteManyController;
}

export { DeleteManyControllerMixin };
