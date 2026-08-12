import { BaseEntity } from '../models';
import { isPublic } from './visibility.predicate';

class TestEntity extends BaseEntity {
  isPublic?: boolean;
  visibility?: boolean;
}

describe('isPublic', () => {
  it.each([
    ['grants access when isPublic is true', { isPublic: true }, true],
    ['denies access when isPublic is false', { isPublic: false }, false],
    ['denies access when isPublic is undefined', {}, false],
  ])('%s', (_description, entityPartial: Partial<TestEntity>, expected: boolean) => {
    const entity = Object.assign(new TestEntity(), entityPartial);

    expect(isPublic<TestEntity>()(entity, undefined)).toBe(expected);
  });

  it('should use a custom field', () => {
    const visible = Object.assign(new TestEntity(), { visibility: true });
    const hidden = Object.assign(new TestEntity(), { visibility: false });

    expect(isPublic<TestEntity>({ field: 'visibility' })(visible, undefined)).toBe(true);
    expect(isPublic<TestEntity>({ field: 'visibility' })(hidden, undefined)).toBe(false);
  });
});
