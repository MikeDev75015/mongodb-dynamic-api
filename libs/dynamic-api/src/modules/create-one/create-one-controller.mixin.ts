import { Body, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateOneController, CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): CreateOneControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { body: CustomBody, presenter: CustomPresenter } = DTOs ?? {};

  class RouteBody extends (CustomBody ?? EntityBodyMixin(entity)) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `CreateOne${displayedName}${version ? 'V' + version : ''}Dto`,
      writable: false,
    });
  }

  class RoutePresenter extends (CustomPresenter ?? EntityPresenterMixin(entity)) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}${version ? 'V' + version : ''}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'CreateOne',
    entity,
    version,
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
    value: `BaseCreateOne${entity.name}${version ? 'V' + version : ''}Controller`,
    writable: false,
  });

  return BaseCreateOneController;
}

export { CreateOneControllerMixin };
