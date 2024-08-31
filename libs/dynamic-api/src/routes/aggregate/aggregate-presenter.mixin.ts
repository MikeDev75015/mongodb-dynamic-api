import { Type } from '@nestjs/common';
import { EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';

function AggregatePresenterMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  AggregateCustomPresenter?: Type,
) {
  class AggregateDto extends (
    AggregateCustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  return AggregateDto;
}

export { AggregatePresenterMixin };
