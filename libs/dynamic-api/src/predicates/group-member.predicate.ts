import { identifiersMatch, resolveIdentifierField } from '../helpers/predicate-identifier.helper';
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
   * an array of ids (both are supported transparently). Also accepts an ordered array of
   * fallback field names — the first one with a defined, non-null value is used — for group
   * identifiers that live under different names depending on context.
   * @default 'groupId'
   */
  userField?: keyof User | (keyof User)[];
  /**
   * Custom comparison between the entity's group value and each candidate user group value.
   * Defaults to strict equality with a string-coerced fallback, which already matches a
   * Mongoose `ObjectId` on the entity side against its string form on the user side — set this
   * only for anything beyond that (e.g. case-insensitive comparison).
   */
  compare?: (entityValue: unknown, userValue: unknown) => boolean;
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
 * @example — fallback across user fields (group field missing on some auth flows)
 * ```typescript
 * abilityPredicate: isGroupMember({ userField: ['groupIds', 'groupId'] })
 * ```
 *
 * Denies access when `user` is `null`/`undefined` (e.g. an anonymous request on a public
 * route combined with `predicateBehavior: 'filter'`) instead of throwing.
 */
function isGroupMember<Entity extends BaseEntity, User = any>(
  options: IsGroupMemberOptions<Entity, User> = {},
): AbilityPredicate<Entity, User> {
  const entityField = (options.entityField ?? 'groupId') as keyof Entity;
  const userField = options.userField ?? ('groupId' as keyof User);
  const compare = options.compare ?? identifiersMatch;

  return (entity: Entity, user: User): boolean => {
    if (user == null) {
      return false;
    }

    const entityGroup = entity[entityField];
    const userGroup = resolveIdentifierField(user, userField);

    if (Array.isArray(userGroup)) {
      return userGroup.some((candidate) => compare(entityGroup, candidate));
    }

    return compare(entityGroup, userGroup);
  };
}

export { isGroupMember, IsGroupMemberOptions };
