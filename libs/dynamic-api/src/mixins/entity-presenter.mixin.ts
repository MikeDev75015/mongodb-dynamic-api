import { Type } from '@nestjs/common';
import { OmitType } from '@nestjs/swagger';
import { BaseEntity } from '../models';

const baseEntityKeysToExclude = <Entity extends BaseEntity>() =>
  [
    'deletedAt',
    'isDeleted',
    '_id',
    '__v',
  ] as (keyof Entity)[];

function EntityPresenterMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  additionalKeysToExclude?: (keyof Entity)[],
) {
  const keysToExclude = [
    ...baseEntityKeysToExclude<Entity>(),
    ...(additionalKeysToExclude ?? []),
  ];

  // @ts-ignore
  class EntityPresenter extends OmitType(entity, keysToExclude) {}

  return EntityPresenter;
}

export { EntityPresenterMixin };
