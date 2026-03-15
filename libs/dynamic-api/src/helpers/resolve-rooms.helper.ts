import { BroadcastRooms } from '../interfaces';

/**
 * Resolves the rooms to target for a broadcast.
 *
 * - If `rooms` is a static string or string[], it is normalised to a deduplicated string[].
 * - If `rooms` is a function, it is called for each item in `data` and all results are
 *   flattened and deduplicated.
 *
 * Returns `undefined` when `rooms` is not defined (caller should fall back to global broadcast).
 */
function resolveRooms<T extends object>(
  rooms: BroadcastRooms<T> | undefined,
  data: T[],
): string[] | undefined {
  if (!rooms) {
    return undefined;
  }

  if (typeof rooms === 'function') {
    const resolved = data.flatMap((item) => {
      const result = rooms(item);
      return Array.isArray(result) ? result : [result];
    });
    return [...new Set(resolved)];
  }

  const staticRooms = Array.isArray(rooms) ? rooms : [rooms];
  return [...new Set(staticRooms)];
}

export { resolveRooms };

