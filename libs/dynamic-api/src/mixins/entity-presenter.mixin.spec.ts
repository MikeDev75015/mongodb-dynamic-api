import { Type } from '@nestjs/common';
import { BaseEntity, SoftDeletableEntity } from '../models';
import { EntityPresenterMixin } from './entity-presenter.mixin';

class Entity extends BaseEntity {
  additionalKey = 'fake-key';
  unit = 'test';
}

class DeletableEntity extends SoftDeletableEntity {
  additionalKey = 'fake-key';
  unit = 'test';
}

describe('EntityPresenterMixin', () => {
  let body: Type;
  const additionalKeysToExclude = ['additionalKey'] as (keyof Entity)[];

  it('should exclude base entity keys', () => {
    expect(new DeletableEntity()).toEqual({
      additionalKey: 'fake-key',
      unit: 'test',
      isDeleted: false,
      deletedAt: null,
    });

    body = EntityPresenterMixin(DeletableEntity);
    expect(new body()).toEqual({ additionalKey: 'fake-key', unit: 'test' });
  });

  it('should exclude base entity and additional keys', () => {
    expect(new Entity()).toEqual({
      additionalKey: 'fake-key',
      unit: 'test',
    });

    body = EntityPresenterMixin(Entity, additionalKeysToExclude);
    expect(new body()).toEqual({ unit: 'test' });
  });
});
