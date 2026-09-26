import { BroadcastAbilityPredicate, BroadcastRooms } from './dynamic-api-ability.interface';

interface BroadcastConfig<ResponseData extends object, User = unknown> {
  enabled: boolean | BroadcastAbilityPredicate<ResponseData, User>;
  eventName?: string;
  rooms?: BroadcastRooms<ResponseData, User>;
  /**
   * When `useAuth` is enabled, a broadcast without `rooms` only reaches authenticated sockets
   * (the `DYNAMIC_API_AUTHENTICATED_ROOM` room) since v6. Set `public: true` to send it to every
   * connected socket, anonymous ones included. Ignored when `rooms` is set.
   */
  public?: boolean;
}

export { BroadcastConfig };

