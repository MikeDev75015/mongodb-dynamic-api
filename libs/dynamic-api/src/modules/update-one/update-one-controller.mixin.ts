import { Body, Param, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateOneController, UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneService } from './update-one-service.interface';

function UpdateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): UpdateOneControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const {
    body: CustomBody,
    param: CustomParam,
    presenter: CustomPresenter,
  } = DTOs ?? {};

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, true)
  ) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `UpdateOne${displayedName}Body`,
      writable: false,
    });
  }

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `UpdateOne${displayedName}Param`,
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
    'UpdateOne',
    entity,
    description,
    RouteParam,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseUpdateOneController<Entity extends BaseEntity>
    implements UpdateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: UpdateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async updateOne(@Param('id') id: string, @Body() body: RouteBody) {
      return this.service.updateOne(id, body as any);
    }
  }

  Object.defineProperty(BaseUpdateOneController, 'name', {
    value: `UpdateOne${entity.name}Controller`,
    writable: false,
  });

  return BaseUpdateOneController;
}

export { UpdateOneControllerMixin };
