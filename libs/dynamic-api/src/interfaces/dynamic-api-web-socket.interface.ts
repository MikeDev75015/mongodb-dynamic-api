import { GatewayMetadata } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseEntity } from '../models';

interface ExtendedSocket<Entity extends BaseEntity = any> extends Socket {
  user?: Entity;
}

/** @internal Not part of the public API. */
type GatewayResponse<Data> = Promise<{ event: string; data: Data }>;

type GatewayOptions = GatewayMetadata;

type DynamicApiWebSocketOptions = GatewayOptions | boolean;

/**
 * Configuration for a single custom WebSocket event handler registered via `enableDynamicAPIWebSockets`.
 *
 * Register any number of `socket.on(name, handler)` listeners in a declarative, type-safe way
 * without mixing business logic into `onConnection`.
 *
 * @typeParam User - Shape of the authenticated user attached to the socket. Defaults to `unknown`.
 *
 * @example
 * ```typescript
 * import type { CustomSocketEventConfig } from 'mongodb-dynamic-api';
 *
 * interface AppUser { id: string; isAdmin: boolean; familyId: string }
 *
 * const voiceCallEvent: CustomSocketEventConfig<AppUser> = {
 *   name: 'voice-call-state-change',
 *   handler: (socket, payload, user) => {
 *     if (payload?.callId) socket.to(`family-${user?.familyId}`).emit('voice-call-state-change', payload);
 *   },
 * };
 *
 * const adminEvent: CustomSocketEventConfig<AppUser> = {
 *   name: 'admin-switch-family',
 *   predicate: (user) => user?.isAdmin === true,
 *   handler: async (socket, payload, user) => { ... },
 * };
 * ```
 */
interface CustomSocketEventConfig<User = unknown> {
  /** Socket.IO event name to listen for. */
  name: string;

  /**
   * Handler invoked each time the event is received on a connected socket.
   *
   * @param socket  The socket that emitted the event.
   * @param payload The raw payload sent by the client. Type it as needed in the handler body.
   * @param user    The authenticated user attached to the socket. `undefined` for unauthenticated sockets.
   */
  handler: (socket: ExtendedSocket, payload: unknown, user?: User) => void | Promise<void>;

  /**
   * Optional guard — if provided, the handler is only invoked when `predicate(user)` returns `true`.
   * Use this instead of a hard-coded `isAdmin` check for full flexibility.
   *
   * @example
   * ```typescript
   * predicate: (user) => (user as AppUser)?.isAdmin === true,
   * ```
   */
  predicate?: (user?: User) => boolean;
}

/**
 * Options object accepted by the new `enableDynamicAPIWebSockets(app, options)` overload.
 */
interface DynamicApiWebSocketSetupOptions {
  /** Maximum number of event listeners (defaults to 10). */
  maxListeners?: number;
  /** Hook called on every new socket connection after JWT verification. */
  onConnection?: (socket: ExtendedSocket, user?: unknown) => void | Promise<void>;
  /** When `true`, gateways and the socket adapter will emit debug logs. */
  debug?: boolean;
  /**
   * Declarative custom Socket.IO event handlers registered on every new connection.
   *
   * Each entry is equivalent to calling `socket.on(name, handler)` inside `onConnection`,
   * but keeps business logic out of the connection hook and provides full type safety.
   *
   * @example
   * ```typescript
   * enableDynamicAPIWebSockets(app, {
   *   customEvents: [
   *     {
   *       name: 'voice-call-state-change',
   *       handler: (socket, payload, user) => {
   *         socket.to(`family-${user?.familyId}`).emit('voice-call-state-change', payload);
   *       },
   *     },
   *     {
   *       name: 'admin-action',
   *       predicate: (user) => user?.isAdmin === true,
   *       handler: async (socket, payload, user) => { ... },
   *     },
   *   ],
   * });
   * ```
   */
  customEvents?: CustomSocketEventConfig[];
  /**
   * When `true`, throws at bootstrap if two unrelated routes resolve to the same broadcast
   * event name (e.g. two different entities using the same custom `eventName`). A warning is
   * always logged for such collisions regardless of this option; set this to `true` to turn
   * that warning into a hard startup failure. Defaults to `false`.
   *
   * Only catches collisions registered by the time `enableDynamicAPIWebSockets` runs — routes
   * registered by modules loaded lazily afterwards are not covered.
   *
   * @example
   * ```typescript
   * enableDynamicAPIWebSockets(app, { failOnEventCollision: true });
   * ```
   */
  failOnEventCollision?: boolean;
  /**
   * When `true`, a socket whose handshake carries a token (`auth.token`) that fails JWT
   * verification (expired, bad signature, malformed…) is **refused** by a Socket.IO middleware:
   * the client receives a `connect_error` whose `message` starts with `Unauthorized:`, so its
   * refresh-then-reconnect logic can run. Sockets connecting without any token are still
   * accepted as anonymous. Defaults to `true` since v6 (`false` before).
   *
   * When `false`, the socket is accepted as anonymous (`user` is `undefined`), but an
   * `unauthorized` event (`{ reason: 'invalid-token', message }`) is emitted to it before
   * `onConnection` runs, so the client is never silently left out of its rooms.
   *
   * @example
   * ```typescript
   * // v5 behavior: accept the socket as anonymous and emit `unauthorized`
   * enableDynamicAPIWebSockets(app, { rejectInvalidToken: false });
   * ```
   */
  rejectInvalidToken?: boolean;
}

/**
 * Payload of the `unauthorized` event emitted to a socket whose handshake token failed JWT
 * verification, when `rejectInvalidToken` is not enabled.
 */
interface SocketUnauthorizedPayload {
  reason: 'invalid-token';
  /** The JWT verification error message (e.g. `jwt expired`). */
  message: string;
}

export type {
  CustomSocketEventConfig,
  DynamicApiWebSocketOptions,
  DynamicApiWebSocketSetupOptions,
  ExtendedSocket,
  GatewayOptions,
  GatewayResponse,
  SocketUnauthorizedPayload,
};
