import { describe, expect, it, test } from 'vitest';
import { Type } from '@nestjs/common';
import { ProtectedField } from '../decorators';
import { BaseEntity, SoftDeletableEntity } from '../models';
import { EntityBodyMixin, stripProtectedFields } from './entity-body.mixin';

class Entity extends BaseEntity {
  additionalKey = 'fake-key';
  unit = 'test';
}

class DeletableEntity extends SoftDeletableEntity {
  additionalKey = 'fake-key';
  unit = 'test';
}

class EntityWithProtected extends BaseEntity {
  name = 'visible';
  passwordHash = 'secret';
  internalCode = 'int-001';
}
ProtectedField()(EntityWithProtected.prototype, 'passwordHash');
ProtectedField()(EntityWithProtected.prototype, 'internalCode');

describe('EntityBodyMixin', () => {
  let body: Type;
  const additionalKeysToExclude = ['additionalKey'] as (keyof Entity)[];

  it('should exclude base entity keys', () => {
    expect(new DeletableEntity()).toEqual({
      additionalKey: 'fake-key',
      unit: 'test',
    });

    body = EntityBodyMixin(DeletableEntity);
    expect(new body()).toEqual({ additionalKey:  'fake-key', unit: 'test' });
  });

  it('should exclude base entity and additional keys', () => {
    expect(new Entity()).toEqual({ additionalKey: 'fake-key', unit: 'test' });

    body = EntityBodyMixin(Entity, true, additionalKeysToExclude);
    expect(new body()).toEqual({ unit: 'test'});
  });

  it('should auto-exclude @ProtectedField keys', () => {
    body = EntityBodyMixin(EntityWithProtected);
    const instance = new body();
    expect(instance).toHaveProperty('name');
    expect(instance).not.toHaveProperty('passwordHash');
    expect(instance).not.toHaveProperty('internalCode');
  });

  it('should combine @ProtectedField auto-exclusion with manual additionalKeysToExclude', () => {
    class Combo extends BaseEntity {
      pub = 'visible';
      manual = 'manual-excluded';
      secret = 'auto-excluded';
    }
    ProtectedField()(Combo.prototype, 'secret');

    body = EntityBodyMixin(Combo, false, ['manual'] as (keyof Combo)[]);
    const instance = new body();
    expect(instance).toHaveProperty('pub');
    expect(instance).not.toHaveProperty('manual');
    expect(instance).not.toHaveProperty('secret');
  });
});

describe('stripProtectedFields', () => {
  class StripEntity extends BaseEntity {
    name: string;
    email: string;
    internalCode: string;
    passwordHash: string;
  }
  ProtectedField()(StripEntity.prototype, 'internalCode');
  ProtectedField()(StripEntity.prototype, 'passwordHash');

  it('should remove @ProtectedField keys from partial at runtime', () => {
    const partial: Partial<StripEntity> = { name: 'Alice', internalCode: 'hack', passwordHash: 'bcrypt' };
    const result = stripProtectedFields(partial, StripEntity);
    expect(result).toHaveProperty('name', 'Alice');
    expect(result).not.toHaveProperty('internalCode');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should return partial unchanged for entity with no @ProtectedField', () => {
    class CleanEntity extends BaseEntity { val: string; }
    const partial: Partial<CleanEntity> = { val: 'ok' };
    expect(stripProtectedFields(partial, CleanEntity)).toEqual(partial);
  });

  it('should not mutate the original partial', () => {
    const original: Partial<StripEntity> = { name: 'Bob', internalCode: 'leak' };
    stripProtectedFields(original, StripEntity);
    expect(original).toHaveProperty('internalCode', 'leak');
  });
});

