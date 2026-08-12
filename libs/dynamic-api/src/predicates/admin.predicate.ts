import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';

/**
 * Options for the `isAdmin` predicate factory.
 *
 * Two mutually exclusive modes are supported: flag mode (default) checks a boolean field on
 * the user; role mode (activated by setting `roleField`) checks a role string field instead.
 */
interface IsAdminOptions<User = any> {
  /**
   * User field holding a boolean admin flag. Ignored when `roleField` is set.
   * @default 'isAdmin'
   */
  field?: keyof User;
  /**
   * User field holding a role string. Setting this switches from flag mode to role mode.
   */
  roleField?: keyof User;
  /**
   * Role value(s) considered "admin" in role mode.
   * @default 'admin'
   */
  role?: string | string[];
}

/**
 * Builds an `AbilityPredicate` granting access to admin users, supporting either a boolean
 * flag convention (`user.isAdmin === true`) or a role-string convention (`user.role === 'admin'`).
 *
 * @example — default boolean flag (`user.isAdmin`)
 * ```typescript
 * import { isAdmin } from 'mongodb-dynamic-api';
 *
 * abilityPredicate: isAdmin()
 * ```
 *
 * @example — custom flag field
 * ```typescript
 * abilityPredicate: isAdmin({ field: 'isSuperUser' })
 * ```
 *
 * @example — role-string convention, single or multiple accepted roles
 * ```typescript
 * abilityPredicate: isAdmin({ roleField: 'role' })
 * abilityPredicate: isAdmin({ roleField: 'role', role: ['admin', 'superadmin'] })
 * ```
 *
 * Denies access when `user` is `null`/`undefined` (e.g. an anonymous request on a public
 * route combined with `predicateBehavior: 'filter'`) instead of throwing.
 */
function isAdmin<Entity extends BaseEntity, User = any>(
  options: IsAdminOptions<User> = {},
): AbilityPredicate<Entity, User> {
  const { roleField, role = 'admin', field = 'isAdmin' as keyof User } = options;
  const allowedRoles = Array.isArray(role) ? role : [role];

  return (_entity: Entity, user: User): boolean => {
    if (user == null) {
      return false;
    }

    if (roleField) {
      return allowedRoles.includes(user[roleField] as unknown as string);
    }

    return (user[field] as unknown) === true;
  };
}

export { isAdmin, IsAdminOptions };
