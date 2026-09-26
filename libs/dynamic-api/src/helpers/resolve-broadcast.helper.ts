import { instanceToPlain } from 'class-transformer';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { resolveRooms } from './resolve-rooms.helper';
import { BroadcastAbilityPredicate, BroadcastConfig } from '../interfaces';

interface ResolvedBroadcast<T extends object> {
  event: string;
  rooms?: string[];
  data: T[];
  /** No `rooms`: only authenticated sockets must receive it (auth enabled and not `public`). */
  authenticatedOnly: boolean;
}

/**
 * Decides whether a broadcast should be emitted and computes its final event name, filtered
 * payload and target rooms. Shared by `DynamicApiBroadcastService.broadcastFromHttp` and
 * `BaseGateway.broadcastIfNeeded` to avoid duplicating this logic.
 *
 * Returns `undefined` when the broadcast must be skipped (no config, no data, `enabled: false`,
 * or the `enabled` predicate filtered out every item).
 *
 * The emitted `data` is serialized with `instanceToPlain`, like an HTTP response goes through
 * `ClassSerializerInterceptor`: fields marked `@Exclude()` on the entity or presenter are never
 * broadcast. `enabled` and `rooms` still receive the original items.
 *
 * @internal Not part of the public API.
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

  const resolvedRooms = resolveRooms(rooms, broadcastData, user);

  return {
    event: eventName || event,
    rooms: resolvedRooms,
    data: broadcastData.map((item) => instanceToPlain(item) as T),
    authenticatedOnly: !resolvedRooms
      && !broadcastConfig.public
      && !!DynamicApiGlobalStateService.getValue('isAuthEnabled'),
  };
}

export { resolveBroadcast, ResolvedBroadcast };
