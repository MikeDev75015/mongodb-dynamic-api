import { GatewayMetadata } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseEntity } from '../models';

interface ExtendedSocket<Entity extends BaseEntity = any> extends Socket {
  user?: Entity;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
type GatewayResponse<Data> = Promise<{ event: string; data: Data }>;

type GatewayOptions = GatewayMetadata;

type DynamicApiWebSocketOptions = GatewayOptions | boolean;

/**
 * Options object accepted by the new `enableDynamicAPIWebSockets(app, options)` overload.
 */
interface DynamicApiWebSocketSetupOptions {
  /** Maximum number of event listeners (defaults to 10). */
  maxListeners?: number;
  /** Hook called on every new socket connection after JWT verification. */
  onConnection?: (socket: ExtendedSocket, user?: any) => void | Promise<void>;
  /** When `true`, gateways and the socket adapter will emit debug logs. */
  debug?: boolean;
}

export type {
  DynamicApiWebSocketOptions,
  DynamicApiWebSocketSetupOptions,
  ExtendedSocket,
  GatewayOptions,
  GatewayResponse,
};
