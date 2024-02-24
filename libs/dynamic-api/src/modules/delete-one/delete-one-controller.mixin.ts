import { BaseEntity, DTOsBundle } from '@dynamic-api';
import {
  DeleteOneController,
  DeleteOneControllerConstructor,
  DeleteOnePresenter,
  DeleteOneService,
} from '@dynamic-api/modules';
import { Param, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { RouteDecoratorsHelper } from '../../helpers';

function DeleteOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): DeleteOneControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const { param: CustomParam, presenter: CustomPresenter } = DTOs ?? {};

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `DeleteOne${displayedName}Param`,
      writable: false,
    });
  }

  class RoutePresenter extends (
    CustomPresenter ?? DeleteOnePresenter
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `DeleteOne${displayedName}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'DeleteOne',
    entity,
    description,
    RouteParam,
    undefined,
    undefined,
    RoutePresenter,
  );

  class BaseDeleteOneController<Entity extends BaseEntity>
    implements DeleteOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async deleteOne(@Param('id') id: string) {
      return this.service.deleteOne(id);
    }
  }

  Object.defineProperty(BaseDeleteOneController, 'name', {
    value: `DeleteOne${entity.name}Controller`,
    writable: false,
  });

  return BaseDeleteOneController;
}

export { DeleteOneControllerMixin };
