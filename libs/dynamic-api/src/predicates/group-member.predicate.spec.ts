import { describe, expect, it } from 'vitest';
import { BaseEntity } from '../models';
import { isGroupMember } from './group-member.predicate';

class TestEntity extends BaseEntity {
  groupId?: string;
  organizationId?: string;
}

interface User {
  groupId?: string;
  groupIds?: string[];
  organizationId?: string;
}

describe('isGroupMember', () => {
  describe('scalar user group (default fields)', () => {
    it.each([
      ['matches when both groups are equal', { groupId: 'g1' }, { groupId: 'g1' }, true],
      ['does not match when groups differ', { groupId: 'g1' }, { groupId: 'g2' }, false],
      ['does not match when entity has no group', {}, { groupId: 'g1' }, false],
    ])('%s', (_description, entityPartial: Partial<TestEntity>, user: User, expected: boolean) => {
      const entity = Object.assign(new TestEntity(), entityPartial);

      expect(isGroupMember<TestEntity, User>()(entity, user)).toBe(expected);
    });
  });

  describe('array user groups', () => {
    it('should match when the entity group is included in the user groups array', () => {
      const entity = Object.assign(new TestEntity(), { groupId: 'g2' });

      expect(isGroupMember<TestEntity, User>({ userField: 'groupIds' })(entity, { groupIds: ['g1', 'g2'] }))
        .toBe(true);
    });

    it('should not match when the entity group is absent from the user groups array', () => {
      const entity = Object.assign(new TestEntity(), { groupId: 'g3' });

      expect(isGroupMember<TestEntity, User>({ userField: 'groupIds' })(entity, { groupIds: ['g1', 'g2'] }))
        .toBe(false);
    });

    it('should not match against an empty array', () => {
      const entity = Object.assign(new TestEntity(), { groupId: 'g1' });

      expect(isGroupMember<TestEntity, User>({ userField: 'groupIds' })(entity, { groupIds: [] })).toBe(false);
    });
  });

  it('should use custom entityField and userField', () => {
    const entity = Object.assign(new TestEntity(), { organizationId: 'org1' });

    expect(
      isGroupMember<TestEntity, User>({ entityField: 'organizationId', userField: 'organizationId' })(
        entity,
        { organizationId: 'org1' },
      ),
    ).toBe(true);
  });

  it('should deny access without throwing when user is undefined (anonymous request)', () => {
    const entity = Object.assign(new TestEntity(), { groupId: 'g1' });

    expect(isGroupMember<TestEntity, User>()(entity, undefined)).toBe(false);
  });

  it('should match a Mongoose ObjectId entity field against its string form on the user (default coercion)', () => {
    class EntityWithObjectId extends BaseEntity {
      groupId?: { toString(): string };
    }

    const entity = Object.assign(new EntityWithObjectId(), { groupId: { toString: () => 'g1' } });

    expect(isGroupMember<EntityWithObjectId, User>()(entity, { groupId: 'g1' })).toBe(true);
  });

  it('should apply the default coercion element-wise against an array of user groups', () => {
    class EntityWithObjectId extends BaseEntity {
      groupId?: { toString(): string };
    }

    const entity = Object.assign(new EntityWithObjectId(), { groupId: { toString: () => 'g2' } });

    expect(
      isGroupMember<EntityWithObjectId, User>({ userField: 'groupIds' })(entity, { groupIds: ['g1', 'g2'] }),
    ).toBe(true);
  });

  it('should fall back across an array of userField candidates', () => {
    interface FallbackUser {
      groupIds?: string[];
      groupId?: string;
    }

    const entity = Object.assign(new TestEntity(), { groupId: 'g1' });

    expect(
      isGroupMember<TestEntity, FallbackUser>({ userField: ['groupIds', 'groupId'] })(entity, { groupId: 'g1' }),
    ).toBe(true);
  });

  it('should use a custom compare function when provided', () => {
    const entity = Object.assign(new TestEntity(), { groupId: 'G1' });

    expect(
      isGroupMember<TestEntity, User>({
        compare: (entityValue, userValue) =>
          String(entityValue).toLowerCase() === String(userValue).toLowerCase(),
      })(entity, { groupId: 'g1' }),
    ).toBe(true);
  });
});
