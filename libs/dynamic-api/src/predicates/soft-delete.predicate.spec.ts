import { SoftDeletableEntity } from '../models';
import { isNotDeleted } from './soft-delete.predicate';

class TestEntity extends SoftDeletableEntity {
  archived?: boolean;
}

describe('isNotDeleted', () => {
  it.each([
    ['grants access when isDeleted is false', { isDeleted: false }, true],
    ['grants access when isDeleted is undefined', {}, true],
    ['denies access when isDeleted is true', { isDeleted: true }, false],
  ])('%s', (_description, entityPartial: Partial<TestEntity>, expected: boolean) => {
    const entity = Object.assign(new TestEntity(), entityPartial);

    expect(isNotDeleted<TestEntity>()(entity, undefined)).toBe(expected);
  });

  it('should use a custom field', () => {
    const archivedEntity = Object.assign(new TestEntity(), { archived: true });
    const activeEntity = Object.assign(new TestEntity(), { archived: false });

    expect(isNotDeleted<TestEntity>({ field: 'archived' })(archivedEntity, undefined)).toBe(false);
    expect(isNotDeleted<TestEntity>({ field: 'archived' })(activeEntity, undefined)).toBe(true);
  });
});
