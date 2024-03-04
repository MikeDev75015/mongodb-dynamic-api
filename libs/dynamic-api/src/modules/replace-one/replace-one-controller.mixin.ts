import { Body, Param, Type } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { ReplaceOneController, ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): ReplaceOneControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const {
    body: CustomBody,
    param: CustomParam,
    presenter: CustomPresenter,
  } = DTOs ?? {};

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity)
  ) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Dto`,
      writable: false,
    });
  }

  class RouteParam extends (
    CustomParam ?? EntityParam
  ) {}

  if (!CustomParam) {
    Object.defineProperty(RouteParam, 'name', {
      value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Param`,
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
    'ReplaceOne',
    entity,
    version,
    description,
    RouteParam,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseReplaceOneController<Entity extends BaseEntity>
    implements ReplaceOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: ReplaceOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async replaceOne(@Param('id') id: string, @Body() body: RouteBody) {
      return this.service.replaceOne(id, body as any);
    }
  }

  Object.defineProperty(BaseReplaceOneController, 'name', {
    value: `BaseReplaceOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseReplaceOneController;
}

export { ReplaceOneControllerMixin };
