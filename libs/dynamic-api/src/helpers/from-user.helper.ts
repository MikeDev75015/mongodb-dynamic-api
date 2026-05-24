import { BaseEntity } from '../models';
import { FromUserMap } from '../interfaces';

/**
 * Injects values from the authenticated user (JWT payload) into a partial entity.
 * Fields mapped to a string are resolved from `user[string]`.
 * Fields mapped to a function receive the whole user object.
 * If `user` is nullish, the partial is returned unchanged.
 */
function applyFromUser<Entity extends BaseEntity>(
  partial: Partial<Entity>,
  fromUser: FromUserMap<Entity> | undefined,
  user: unknown,
): Partial<Entity> {
  if (!fromUser || !user) {
    return partial;
  }

  const result: Partial<Entity> = { ...partial };

  for (const field of Object.keys(fromUser) as (keyof Entity)[]) {
    const source = fromUser[field];

    if (typeof source === 'function') {
      result[field] = source(user) as Entity[typeof field];
    } else if (typeof source === 'string' && typeof user === 'object' && user !== null) {
      result[field] = (user as Record<string, unknown>)[source] as Entity[typeof field];
    }
  }

  return result;
}

export { applyFromUser };

