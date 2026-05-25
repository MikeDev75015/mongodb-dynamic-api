import { Inject } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DynamicApiWsConfigStore } from '../../helpers/ws-config.store';
import {
  DYNAMIC_API_PRESENCE_ADAPTER,
  ExtendedSocket,
  GatewayOptions,
  PresenceAdapter,
  PresenceEventPayload,
} from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger';

/**
 * Factory that creates a `PresenceGateway` bound to the provided WebSocket options.
 *
 * The gateway hooks into the socket.io server `connection` event (via `afterInit`)
 * to track user presence. It:
 *  1. Calls `presenceAdapter.setOnline(userId, socketId)` on connect.
 *  2. Emits `user:online` to all connected clients.
 *  3. On disconnect calls `presenceAdapter.setOffline(userId, socketId)`.
 *  4. Emits `user:offline` when the user's last socket disconnects.
 *
 * Anonymous connections (no `socket.user`) are silently ignored.
 *
 * Uses the **same** gateway options (port / namespace) as the rest of the
 * DynamicApi gateways (Option B: shared namespace).
 */
export function createPresenceGateway(options: GatewayOptions = {}) {
  @WebSocketGateway(options)
  class PresenceGateway implements OnGatewayInit {
    readonly logger = new MongoDBDynamicApiLogger('PresenceGateway');

    @WebSocketServer()
    server: Server;

    constructor(
      @Inject(DYNAMIC_API_PRESENCE_ADAPTER)
      readonly presenceAdapter: PresenceAdapter,
    ) {}

    afterInit(server: Server): void {
      server.on('connection', (socket: Socket) => {
        this.onSocketConnection(server, socket as ExtendedSocket);
      });
    }

    onSocketConnection(server: Server, socket: ExtendedSocket): void {
      const userId = socket.user?.id;

      if (!userId) {
        return;
      }

      this.presenceAdapter.setOnline(userId, socket.id).then(() => {
        const payload: PresenceEventPayload = { userId };
        server.emit('user:online', payload);

        if (DynamicApiWsConfigStore.debug) {
          this.logger.log(
            `[Presence] user:online – userId=${userId}, socketId=${socket.id}`,
          );
        }

        socket.on('disconnect', () => {
          this.onSocketDisconnect(server, userId, socket.id);
        });
      });
    }

    onSocketDisconnect(
      server: Server,
      userId: string,
      socketId: string,
    ): void {
      this.presenceAdapter
        .setOffline(userId, socketId)
        .then(() => this.presenceAdapter.getSocketCount(userId))
        .then((count) => {
          if (DynamicApiWsConfigStore.debug) {
            this.logger.log(
              `[Presence] user:offline – userId=${userId}, socketId=${socketId}, remainingSockets=${count}`,
            );
          }

          if (count === 0) {
            const payload: PresenceEventPayload = { userId };
            server.emit('user:offline', payload);
          }
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`[Presence] disconnect handler error: ${message}`);
        });
    }
  }

  return PresenceGateway;
}
