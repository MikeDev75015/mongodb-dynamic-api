import { Type } from '@nestjs/common';
import { OmitType } from '@nestjs/swagger';
import { BaseEntity } from '../models';

function EntityPresenterMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  keysToExclude?: (keyof Entity)[],
) {

  // @ts-ignore
  class EntityPresenter extends (
    keysToExclude ? OmitType(entity, keysToExclude) : entity
  ) {}

  return EntityPresenter;
}

export { EntityPresenterMixin };
