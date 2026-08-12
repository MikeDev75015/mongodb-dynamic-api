import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Options for the `isGroupMember` predicate factory.
 */
interface IsGroupMemberOptions<Entity extends BaseEntity, User = any> {
  /**
   * Entity field holding the group identifier the entity belongs to.
   * @default 'groupId'
   */
  entityField?: keyof Entity;
  /**
   * User field holding the group identifier(s) the user belongs to — either a single id or
   * an array of ids (both are supported transparently).
   * @default 'groupId'
   */
  userField?: keyof User;
}

/**
 * Builds an `AbilityPredicate` granting access when the entity's group matches (one of) the
 * authenticated user's group(s). Generic enough to model family membership, team membership,
 * organization/tenant scoping, or any other "belongs to the same group" relationship.
 *
 * @example — single group id on both sides
 * ```typescript
 * import { isGroupMember } from 'mongodb-dynamic-api';
 *
 * abilityPredicate: isGroupMember() // entity.groupId === user.groupId
 * ```
 *
 * @example — user belongs to multiple groups (array field)
 * ```typescript
 * // user.groupIds: string[] — entity.groupId is checked against that array
 * abilityPredicate: isGroupMember({ userField: 'groupIds' })
 * ```
 *
 * @example — custom field names (e.g. organization scoping)
 * ```typescript
 * abilityPredicate: isGroupMember({ entityField: 'organizationId', userField: 'organizationId' })
 * ```
 *
 * Denies access when `user` is `null`/`undefined` (e.g. an anonymous request on a public
 * route combined with `predicateBehavior: 'filter'`) instead of throwing.
 */
function isGroupMember<Entity extends BaseEntity, User = any>(
  options: IsGroupMemberOptions<Entity, User> = {},
): AbilityPredicate<Entity, User> {
  const entityField = (options.entityField ?? 'groupId') as keyof Entity;
  const userField = (options.userField ?? 'groupId') as keyof User;

  return (entity: Entity, user: User): boolean => {
    if (user == null) {
      return false;
    }

    const entityGroup = entity[entityField] as unknown;
    const userGroup = user[userField] as unknown;

    if (Array.isArray(userGroup)) {
      return userGroup.includes(entityGroup);
    }

    return entityGroup === userGroup;
  };
}

export { isGroupMember, IsGroupMemberOptions };
