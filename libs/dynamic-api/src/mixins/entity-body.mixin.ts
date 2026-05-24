import { Type } from '@nestjs/common';
import { OmitType, PartialType } from '@nestjs/swagger';
import { PROTECTED_FIELD_METADATA } from '../decorators/protected-field.decorator';
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

function getProtectedFieldKeys<Entity extends BaseEntity>(entity: Type<Entity>): (keyof Entity)[] {
  return (
    (Reflect.getMetadata(PROTECTED_FIELD_METADATA, entity.prototype) as (keyof Entity)[] | undefined) ?? []
  );
}

function EntityBodyMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  optional = false,
  additionalKeysToExclude?: (keyof Entity)[],
) {
  const protectedKeys = getProtectedFieldKeys(entity);

  const keysToExclude = [
    ...baseEntityKeysToExclude<Entity>(),
    ...protectedKeys,
    ...(additionalKeysToExclude ?? []),
  ];

  // @ts-ignore
  class EntityBody extends OmitType(entity, keysToExclude) {}

  return optional ? PartialType(EntityBody) : EntityBody;
}

export { baseEntityKeysToExclude, EntityBodyMixin, getProtectedFieldKeys };
