import { Body, Type } from '@nestjs/common';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { Type as TypeTransformer } from 'class-transformer';
import { RouteDecoratorsBuilder } from '../../builders';
import { pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { DTOsBundle } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateManyController, CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyService } from './create-many-service.interface';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): CreateManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { body: CustomBody, presenter: CustomPresenter } = DTOs ?? {};

  class DtoBody extends EntityBodyMixin(entity) {}

  Object.defineProperty(DtoBody, 'name', {
    value: `${displayedName}${version ? 'V' + version : ''}Dto`,
    writable: false,
  });

  class CreateManyBody {
    @ApiProperty({ type: [DtoBody] })
    @ValidateNested({ each: true })
    @IsInstance(DtoBody, { each: true })
    @ArrayMinSize(1)
    @TypeTransformer(() => DtoBody)
    list: DtoBody[];
  }

  class RouteBody extends PickType(CustomBody ?? CreateManyBody, ['list']) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `CreateMany${displayedName}${version ? 'V' + version : ''}Dto`,
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
    'CreateMany',
    entity,
    version,
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
    value: `BaseCreateMany${entity.name}${version ? 'V' + version : ''}Controller`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
