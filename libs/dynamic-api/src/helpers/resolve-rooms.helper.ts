import { BroadcastRooms } from '../interfaces';

/**
 * Resolves the rooms to target for a broadcast.
 *
 * - If `rooms` is a static string or string[], it is normalised to a deduplicated string[].
 * - If `rooms` is a function, it is called for each item in `data` (with the optional `user`)
 *   and all results are flattened and deduplicated.
 *
 * Returns `undefined` when `rooms` is not defined (caller should fall back to global broadcast).
 *
 * @deprecated Internal API — will be removed from public exports in v5.
 */
function resolveRooms<T extends object, User = unknown>(
  rooms: BroadcastRooms<T, User> | undefined,
  data: T[],
  user?: User,
): string[] | undefined {
  if (!rooms) {
    return undefined;
  }

  if (typeof rooms === 'function') {
    const resolved = data.flatMap((item) => {
      const result = rooms(item, user);
      return Array.isArray(result) ? result : [result];
    });
    return [...new Set(resolved)];
  }

  const staticRooms = Array.isArray(rooms) ? rooms : [rooms];
  return [...new Set(staticRooms)];
}

export { resolveRooms };

