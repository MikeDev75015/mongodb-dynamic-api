import { Body, Param, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateOneController, DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): DuplicateOneControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
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
      value: `DuplicateOne${displayedName}${addVersionSuffix(version)}Dto`,
      writable: false,
    });
  }

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `DuplicateOne${displayedName}${addVersionSuffix(version)}Param`,
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
    'DuplicateOne',
    entity,
    version,
    description,
    RouteParam,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseDuplicateOneController<Entity extends BaseEntity>
    implements DuplicateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DuplicateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async duplicateOne(@Param('id') id: string, @Body() body?: RouteBody) {
      return this.service.duplicateOne(id, body as any);
    }
  }

  Object.defineProperty(BaseDuplicateOneController, 'name', {
    value: `BaseDuplicateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDuplicateOneController;
}

export { DuplicateOneControllerMixin };
