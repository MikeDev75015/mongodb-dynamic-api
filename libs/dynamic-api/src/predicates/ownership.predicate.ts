import { identifiersMatch, resolveIdentifierField } from '../helpers/predicate-identifier.helper';
import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Options for the `isOwner` predicate factory.
 */
interface IsOwnerOptions<Entity extends BaseEntity, User = any> {
  /**
   * Entity field holding the owner's identifier.
   * @default 'ownerId'
   */
  entityField?: keyof Entity;
  /**
   * User field holding the current user's identifier. Accepts an ordered array of fallback
   * field names — the first one with a defined, non-null value is used — for identifiers that
   * live under different names depending on context (e.g. `id` over HTTP, `sub` on a raw JWT).
   * @default 'id'
   */
  userField?: keyof User | (keyof User)[];
  /**
   * Custom comparison between the entity's owner value and the resolved user value. Defaults to
   * strict equality with a string-coerced fallback, which already matches a Mongoose `ObjectId`
   * on the entity side against its string form on the user side — set this only for anything
   * beyond that (e.g. case-insensitive comparison).
   */
  compare?: (entityValue: unknown, userValue: unknown) => boolean;
}

/**
 * Builds an `AbilityPredicate` granting access when the entity's owner field matches the
 * authenticated user's identifier field.
 *
 * @example — default `ownerId`/`id` fields
 * ```typescript
 * import { isOwner } from 'mongodb-dynamic-api';
 *
 * DynamicApiModule.forFeature({
 *   entity: Article,
 *   routes: [
 *     { type: 'UpdateOne', abilityPredicate: isOwner() },
 *   ],
 * });
 * ```
 *
 * @example — custom field names
 * ```typescript
 * abilityPredicate: isOwner({ entityField: 'authorId', userField: 'id' })
 * ```
 *
 * @example — fallback across user fields (id missing on some auth flows)
 * ```typescript
 * abilityPredicate: isOwner({ userField: ['id', 'sub'] })
 * ```
 *
 * Denies access when `user` is `null`/`undefined` (e.g. an anonymous request on a public
 * route combined with `predicateBehavior: 'filter'`) instead of throwing.
 */
function isOwner<Entity extends BaseEntity, User = any>(
  options: IsOwnerOptions<Entity, User> = {},
): AbilityPredicate<Entity, User> {
  const entityField = (options.entityField ?? 'ownerId') as keyof Entity;
  const userField = options.userField ?? ('id' as keyof User);
  const compare = options.compare ?? identifiersMatch;

  return (entity: Entity, user: User): boolean => {
    if (user == null) {
      return false;
    }

    return compare(entity[entityField], resolveIdentifierField(user, userField));
  };
}

export { isOwner, IsOwnerOptions };
