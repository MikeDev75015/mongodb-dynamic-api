import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Options for the `isNotDeleted` predicate factory.
 */
interface IsNotDeletedOptions<Entity extends BaseEntity> {
  /**
   * Entity field flagging soft-deletion.
   * @default 'isDeleted' — matches `SoftDeletableEntity`.
   */
  field?: keyof Entity;
}

/**
 * Builds an `AbilityPredicate` denying access to soft-deleted entities. Works out of the box
 * for entities extending `SoftDeletableEntity` (field `isDeleted`), and for any entity with a
 * custom soft-delete flag via the `field` option.
 *
 * @example — entity extends `SoftDeletableEntity`
 * ```typescript
 * import { isNotDeleted } from 'mongodb-dynamic-api';
 *
 * abilityPredicate: isNotDeleted()
 * ```
 *
 * @example — custom soft-delete field
 * ```typescript
 * abilityPredicate: isNotDeleted({ field: 'archived' })
 * ```
 */
function isNotDeleted<Entity extends BaseEntity, User = any>(
  options: IsNotDeletedOptions<Entity> = {},
): AbilityPredicate<Entity, User> {
  const field = (options.field ?? 'isDeleted') as keyof Entity;

  return (entity: Entity, _user: User): boolean => (entity[field] as unknown) !== true;
}

export { isNotDeleted, IsNotDeletedOptions };
