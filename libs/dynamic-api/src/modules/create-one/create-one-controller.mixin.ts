import { BaseEntity, DTOsBundle, EntityBodyMixin, EntityPresenterMixin } from '@dynamic-api';
import {
  CreateOneController,
  CreateOneControllerConstructor,
  CreateOneService,
} from '@dynamic-api/modules';
import { Body, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { RouteDecoratorsHelper } from '../../helpers';

function CreateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): CreateOneControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const { body: CustomBody, presenter: CustomPresenter } = DTOs ?? {};

  class RouteBody extends (CustomBody ?? EntityBodyMixin(entity)) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `CreateOne${displayedName}Body`,
      writable: false,
    });
  }

  class RoutePresenter extends (CustomPresenter ?? EntityPresenterMixin(entity)) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'CreateOne',
    entity,
    description,
    undefined,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseCreateOneController<Entity extends BaseEntity>
    implements CreateOneController<Entity>
  {
    protected readonly entity = entity;

    constructor(protected readonly service: CreateOneService<Entity>) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async createOne(@Body() body: RouteBody) {
      return this.service.createOne(body as unknown as Partial<Entity>);
    }
  }

  Object.defineProperty(BaseCreateOneController, 'name', {
    value: `CreateOne${entity.name}Controller`,
    writable: false,
  });

  return BaseCreateOneController;
}

export { CreateOneControllerMixin };
