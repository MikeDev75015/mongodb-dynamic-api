import { resolveRooms } from './resolve-rooms.helper';
import { BroadcastAbilityPredicate, BroadcastConfig } from '../interfaces';

interface ResolvedBroadcast<T extends object> {
  event: string;
  rooms?: string[];
  data: T[];
}

/**
 * Decides whether a broadcast should be emitted and computes its final event name, filtered
 * payload and target rooms. Shared by `DynamicApiBroadcastService.broadcastFromHttp` and
 * `BaseGateway.broadcastIfNeeded` to avoid duplicating this logic.
 *
 * Returns `undefined` when the broadcast must be skipped (no config, no data, `enabled: false`,
 * or the `enabled` predicate filtered out every item).
 *
 * @internal Not part of the public API — will be removed from the package's public exports in v5.
 */
function resolveBroadcast<T extends object, User = unknown>(
  event: string,
  data: T[],
  broadcastConfig: BroadcastConfig<T, User> | undefined,
  user?: User,
): ResolvedBroadcast<T> | undefined {
  if (!broadcastConfig || !data?.length) {
    return undefined;
  }

  const { enabled, eventName, rooms } = broadcastConfig;

  if (typeof enabled === 'boolean' && !enabled) {
    return undefined;
  }

  const broadcastData = typeof enabled === 'function'
    ? data.filter((item) => (enabled as BroadcastAbilityPredicate<T, User>)(item, user as User))
    : data;

  if (!broadcastData.length) {
    return undefined;
  }

  return {
    event: eventName || event,
    rooms: resolveRooms(rooms, broadcastData, user),
    data: broadcastData,
  };
}

export { resolveBroadcast, ResolvedBroadcast };
