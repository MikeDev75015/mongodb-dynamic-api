import { BaseEntity, DTOsBundle, EntityBodyMixin, EntityPresenterMixin } from '@dynamic-api';
import {
  CreateManyController,
  CreateManyControllerConstructor,
  CreateManyService,
} from '@dynamic-api/modules';
import { Body, Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { RouteDecoratorsBuilder } from '../../builders';
import { RouteDecoratorsHelper } from '../../helpers';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): CreateManyControllerConstructor<Entity> {
  const displayedName = apiTag ?? entity.name;
  const { body: CustomBody, presenter: CustomPresenter } = DTOs ?? {};

  class DtoBody extends EntityBodyMixin(entity) {}
  class CreateManyBody {
    @ApiProperty({ type: [DtoBody] })
    @ValidateNested({ each: true })
    @IsInstance(DtoBody, { each: true })
    @ArrayMinSize(1)
    list: DtoBody[];
  }

  class RouteBody extends (CustomBody ?? CreateManyBody) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `CreateMany${displayedName}Body`,
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
    'CreateMany',
    entity,
    description,
    undefined,
    undefined,
    RouteBody,
    RoutePresenter,
  );

  class BaseCreateManyController<Entity extends BaseEntity>
    implements CreateManyController<Entity>
  {
    protected readonly entity = entity;

    constructor(protected readonly service: CreateManyService<Entity>) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    async createMany(@Body() body: RouteBody) {
      return this.service.createMany(body.list as unknown as Partial<Entity>[]);
    }
  }

  Object.defineProperty(BaseCreateManyController, 'name', {
    value: `CreateMany${entity.name}Controller`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
