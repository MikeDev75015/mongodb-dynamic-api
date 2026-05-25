/** Injection token for the PresenceAdapter in NestJS DI. */
const DYNAMIC_API_PRESENCE_ADAPTER = Symbol('DYNAMIC_API_PRESENCE_ADAPTER');

/**
 * Contract every presence adapter must satisfy.
 * All methods are async to support both in-memory and network-backed (Redis) implementations.
 */
interface PresenceAdapter {
  /** Mark userId + socketId as online, optionally bound to a room. */
  setOnline(userId: string, socketId: string, room?: string): Promise<void>;
  /** Remove a socket from the user's online set. */
  setOffline(userId: string, socketId: string): Promise<void>;
  /** Return true when the user has at least one active socket. */
  isOnline(userId: string): Promise<boolean>;
  /** Return the list of online user IDs, filtered by room when provided. */
  getOnlineUserIds(room?: string): Promise<string[]>;
  /** Return the number of active sockets for a given user (multi-tab support). */
  getSocketCount(userId: string): Promise<number>;
}

/**
 * Options passed to `DynamicApiPresenceModule.register()`.
 */
interface PresenceRegisterOptions {
  /** Backend to use — 'memory' (default) or 'redis'. */
  adapter: 'memory' | 'redis';
  /**
   * Redis connection URL — required when `adapter === 'redis'`.
   * @example 'redis://localhost:6379'
   */
  redisUrl?: string;
  /**
   * TTL in seconds applied to every Redis key on write.
   * Prevents stale entries when a process crashes without emitting disconnect.
   * @default 60
   */
  redisTtlSeconds?: number;
  /**
   * Expose a `GET /presence` HTTP endpoint.
   * Accepts optional `?room=<roomId>` query param.
   * @default false
   */
  enableController?: boolean;
}

/** Shape of the payload emitted on `user:online` / `user:offline` events. */
interface PresenceEventPayload {
  userId: string;
}

/** Shape of the `GET /presence` HTTP response. */
interface PresenceResponse {
  onlineUserIds: string[];
}

export type {
  PresenceAdapter,
  PresenceRegisterOptions,
  PresenceEventPayload,
  PresenceResponse,
};
export { DYNAMIC_API_PRESENCE_ADAPTER };

