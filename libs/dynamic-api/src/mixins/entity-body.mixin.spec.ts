import { Type } from '@nestjs/common';
import { ProtectedField } from '../decorators/protected-field.decorator';
import { BaseEntity, SoftDeletableEntity } from '../models';
import { EntityBodyMixin } from './entity-body.mixin';

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

