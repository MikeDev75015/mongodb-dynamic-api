import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';

function EntityPresenterMixin<Entity extends BaseEntity>(entity: Type<Entity>) {
  class EntityPresenter extends entity {}

  return EntityPresenter;
}

export { EntityPresenterMixin };
