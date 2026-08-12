import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Options for the `isPublic` predicate factory.
 */
interface IsPublicOptions<Entity extends BaseEntity> {
  /**
   * Entity field flagging public visibility.
   * @default 'isPublic'
   */
  field?: keyof Entity;
}

/**
 * Builds an `AbilityPredicate` granting access when the entity is flagged public. Meant to be
 * combined with other predicates (e.g. `isOwner`) via `anyOf`/`allOf` for "public or owner"
 * style visibility rules.
 *
 * @example — default `isPublic` field
 * ```typescript
 * import { anyOf, isOwner, isPublic } from 'mongodb-dynamic-api';
 *
 * // Anyone can see public entities; otherwise only the owner can.
 * abilityPredicate: anyOf(isPublic(), isOwner())
 * ```
 *
 * @example — custom field name
 * ```typescript
 * abilityPredicate: isPublic({ field: 'visibility' })
 * ```
 */
function isPublic<Entity extends BaseEntity, User = any>(
  options: IsPublicOptions<Entity> = {},
): AbilityPredicate<Entity, User> {
  const field = (options.field ?? 'isPublic') as keyof Entity;

  return (entity: Entity, _user: User): boolean => (entity[field] as unknown) === true;
}

export { isPublic, IsPublicOptions };
