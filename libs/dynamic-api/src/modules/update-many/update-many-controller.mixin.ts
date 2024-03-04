import { Body, Query, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateManyController, UpdateManyControllerConstructor } from './update-many-controller.interface';
import { UpdateManyService } from './update-many-service.interface';

function UpdateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): UpdateManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const {
    body: CustomBody,
    presenter: CustomPresenter,
  } = DTOs ?? {};

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, true)
  ) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `UpdateMany${displayedName}${addVersionSuffix(version)}Dto`,
      writable: false,
    });
  }

  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}${addVersionSuffix(version)}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'UpdateMany',
    entity,
    version,
    description,
    undefined,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseUpdateManyController<Entity extends BaseEntity>
    implements UpdateManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: UpdateManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async updateMany(@Query('ids') ids: string[], @Body() body: RouteBody) {
      return this.service.updateMany(ids, body as any);
    }
  }

  Object.defineProperty(BaseUpdateManyController, 'name', {
    value: `BaseUpdateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseUpdateManyController;
}

export { UpdateManyControllerMixin };
