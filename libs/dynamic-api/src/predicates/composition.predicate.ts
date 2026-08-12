import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Combines several `AbilityPredicate`s into one that grants access only when **all** of them
 * do (logical AND). With zero predicates, grants access unconditionally — consistent with
 * `Array.prototype.every` on an empty array.
 *
 * @example
 * ```typescript
 * import { allOf, isGroupMember, isNotDeleted } from 'mongodb-dynamic-api';
 *
 * abilityPredicate: allOf(isNotDeleted(), isGroupMember())
 * ```
 */
function allOf<Entity extends BaseEntity, User = any>(
  ...predicates: AbilityPredicate<Entity, User>[]
): AbilityPredicate<Entity, User> {
  return (entity: Entity, user: User): boolean => predicates.every((predicate) => predicate(entity, user));
}

/**
 * Combines several `AbilityPredicate`s into one that grants access when **any** of them does
 * (logical OR). With zero predicates, denies access unconditionally — consistent with
 * `Array.prototype.some` on an empty array.
 *
 * @example
 * ```typescript
 * import { anyOf, isOwner, isPublic } from 'mongodb-dynamic-api';
 *
 * abilityPredicate: anyOf(isPublic(), isOwner())
 * ```
 */
function anyOf<Entity extends BaseEntity, User = any>(
  ...predicates: AbilityPredicate<Entity, User>[]
): AbilityPredicate<Entity, User> {
  return (entity: Entity, user: User): boolean => predicates.some((predicate) => predicate(entity, user));
}

/**
 * Inverts an `AbilityPredicate` (logical NOT).
 *
 * @example
 * ```typescript
 * import { isGroupMember, not } from 'mongodb-dynamic-api';
 *
 * // Only users outside the entity's group may access it.
 * abilityPredicate: not(isGroupMember())
 * ```
 */
function not<Entity extends BaseEntity, User = any>(
  predicate: AbilityPredicate<Entity, User>,
): AbilityPredicate<Entity, User> {
  return (entity: Entity, user: User): boolean => !predicate(entity, user);
}

export { allOf, anyOf, not };
