import { Type } from '@nestjs/common';
import { EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';

function CreateManyPresenterMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  CreateManyCustomPresenter?: Type,
) {
  class CreateManyDto extends (
    CreateManyCustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  return CreateManyDto;
}

export { CreateManyPresenterMixin };
