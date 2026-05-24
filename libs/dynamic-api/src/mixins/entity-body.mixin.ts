import { Type } from '@nestjs/common';
import { OmitType, PartialType } from '@nestjs/swagger';
import { PROTECTED_FIELD_METADATA } from '../decorators';
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

/**
 * Strips @ProtectedField keys from a partial entity at **runtime**.
 * OmitType only removes keys from TypeScript types and Swagger docs — it does NOT
 * prevent the JSON body from carrying those keys at runtime. This function must be
 * called in controller mixins after body → partial conversion to enforce the protection.
 */
function stripProtectedFields<Entity extends BaseEntity>(
  partial: Partial<Entity>,
  entity: Type<Entity>,
): Partial<Entity> {
  const keys = getProtectedFieldKeys(entity);
  if (!keys.length) return partial;

  const result = { ...partial };
  for (const key of keys) {
    delete result[key];
  }
  return result;
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

export { baseEntityKeysToExclude, EntityBodyMixin, getProtectedFieldKeys, stripProtectedFields };
