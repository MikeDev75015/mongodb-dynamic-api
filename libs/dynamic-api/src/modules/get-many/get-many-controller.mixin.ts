import { Query, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityQuery } from '../../dtos';
import { RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetManyController, GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): GetManyControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const { query: CustomQuery, presenter: CustomPresenter } = DTOs ?? {};

  class RouteQuery extends (
    CustomQuery ?? EntityQuery
  ) {}

  if (!CustomQuery) {
    Object.defineProperty(RouteQuery, 'name', {
      value: `GetMany${displayedName}Query`,
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
    'GetMany',
    entity,
    description,
    undefined,
    RouteQuery,
    undefined,
    RoutePresenter,
  );

  class BaseGetManyController<Entity extends BaseEntity>
    implements GetManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async getMany(@Query() query: RouteQuery) {
      return this.service.getMany(query);
    }
  }

  Object.defineProperty(BaseGetManyController, 'name', {
    value: `GetMany${entity.name}Controller`,
    writable: false,
  });

  return BaseGetManyController;
}

export { GetManyControllerMixin };
