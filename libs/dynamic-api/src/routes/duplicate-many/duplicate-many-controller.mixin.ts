import { Body, Query, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyController, DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): DuplicateManyControllerConstructor<Entity> {
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
      value: `DuplicateMany${displayedName}${addVersionSuffix(version)}Dto`,
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
    'DuplicateMany',
    entity,
    version,
    description,
    undefined,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseDuplicateManyController<Entity extends BaseEntity>
    implements DuplicateManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DuplicateManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async duplicateMany(@Query('ids') ids: string[], @Body() body?: RouteBody) {
      return this.service.duplicateMany(ids, body as any);
    }
  }

  Object.defineProperty(BaseDuplicateManyController, 'name', {
    value: `BaseDuplicateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDuplicateManyController;
}

export { DuplicateManyControllerMixin };
