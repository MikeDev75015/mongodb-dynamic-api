import { Type } from '@nestjs/common';
import { OmitType, PartialType } from '@nestjs/swagger';
import { BaseEntity } from '../models';

const baseEntityKeysToExclude = <Entity extends BaseEntity>() =>
  [
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'isDeleted',
    '_id',
    '__v',
  ] as (keyof Entity)[];

function EntityBodyMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  update = false,
  additionalKeysToExclude?: (keyof Entity)[],
) {
  const keysToExclude = [
    ...baseEntityKeysToExclude<Entity>(),
    ...(additionalKeysToExclude ?? []),
  ];

  // @ts-ignore
  class EntityBody extends OmitType(entity, keysToExclude) {}

  return update ? PartialType(EntityBody) : EntityBody;
}

export { baseEntityKeysToExclude, EntityBodyMixin };
