import { BaseEntity, DTOsBundle, EntityPresenterMixin, EntityQuery } from '@dynamic-api';
import { GetOneController, GetOneControllerConstructor, GetOneService } from '@dynamic-api/modules';
import { Param, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { RouteDecoratorsHelper } from '../../helpers';

function GetOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): GetOneControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const {
    param: CustomParam,
    query: CustomQuery,
    presenter: CustomPresenter,
  } = DTOs ?? {};

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `GetOne${displayedName}Param`,
      writable: false,
    });
  }

  class RouteQuery extends (
    CustomQuery ?? EntityQuery
  ) {}

  if (!CustomQuery) {
    Object.defineProperty(RouteQuery, 'name', {
      value: `GetOne${displayedName}Query`,
      writable: false,
    });
  }

  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'GetOne',
    entity,
    description,
    RouteParam,
    RouteQuery,
    undefined,
    RoutePresenter,
  );

  class BaseGetOneController<Entity extends BaseEntity>
    implements GetOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async getOne(@Param('id') id: string) {
      return this.service.getOne(id);
    }
  }

  Object.defineProperty(BaseGetOneController, 'name', {
    value: `GetOne${entity.name}Controller`,
    writable: false,
  });

  return BaseGetOneController;
}

export { GetOneControllerMixin };
