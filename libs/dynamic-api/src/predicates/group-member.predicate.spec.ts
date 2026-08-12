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
});
