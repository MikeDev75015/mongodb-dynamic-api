import { BaseEntity } from '../models';
import { isOwner } from './ownership.predicate';

class TestEntity extends BaseEntity {
  ownerId?: string;
  authorId?: string;
}

interface User {
  id: string;
  userId?: string;
}

describe('isOwner', () => {
  it.each([
    ['matches with default fields', { ownerId: 'u1' }, { id: 'u1' }, true],
    ['does not match with default fields', { ownerId: 'u1' }, { id: 'u2' }, false],
    ['does not match when entity field is undefined', {}, { id: 'u1' }, false],
  ])('%s', (_description, entityPartial: Partial<TestEntity>, user: User, expected: boolean) => {
    const entity = Object.assign(new TestEntity(), entityPartial);

    expect(isOwner<TestEntity, User>()(entity, user)).toBe(expected);
  });

  it('should use custom entityField and userField', () => {
    const entity = Object.assign(new TestEntity(), { authorId: 'u1' });
    const user: User = { id: 'ignored', userId: 'u1' };

    expect(isOwner<TestEntity, User>({ entityField: 'authorId', userField: 'userId' })(entity, user)).toBe(true);
  });

  it('should not match custom fields when values differ', () => {
    const entity = Object.assign(new TestEntity(), { authorId: 'u1' });
    const user: User = { id: 'ignored', userId: 'u2' };

    expect(isOwner<TestEntity, User>({ entityField: 'authorId', userField: 'userId' })(entity, user)).toBe(false);
  });

  it('should deny access without throwing when user is undefined (anonymous request)', () => {
    const entity = Object.assign(new TestEntity(), { ownerId: 'u1' });

    expect(isOwner<TestEntity, User>()(entity, undefined)).toBe(false);
  });
});
