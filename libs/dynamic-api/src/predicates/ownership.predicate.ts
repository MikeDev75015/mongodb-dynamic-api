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
   * User field holding the current user's identifier.
   * @default 'id'
   */
  userField?: keyof User;
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
 * Denies access when `user` is `null`/`undefined` (e.g. an anonymous request on a public
 * route combined with `predicateBehavior: 'filter'`) instead of throwing.
 */
function isOwner<Entity extends BaseEntity, User = any>(
  options: IsOwnerOptions<Entity, User> = {},
): AbilityPredicate<Entity, User> {
  const entityField = (options.entityField ?? 'ownerId') as keyof Entity;
  const userField = (options.userField ?? 'id') as keyof User;

  return (entity: Entity, user: User): boolean => {
    if (user == null) {
      return false;
    }

    return (entity[entityField] as unknown) === (user[userField] as unknown);
  };
}

export { isOwner, IsOwnerOptions };
