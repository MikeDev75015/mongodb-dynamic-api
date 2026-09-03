import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { resolveBroadcast } from '../../helpers/resolve-broadcast.helper';
import { BroadcastConfig } from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger/mongo-dynamic-api.logger';

/**
 * Broadcasts an event over the same WebSocket server the library's own auto-generated routes
 * use, applying the same room resolution and error-isolation guarantees. This is the sanctioned
 * way to emit realtime updates from a **custom route** that bypasses the auto CRUD pipeline
 * (which otherwise broadcasts on your behalf) — inject it, or instantiate it directly, from
 * anywhere `emit()` needs to fire manually.
 */
@Injectable()
export class DynamicApiBroadcastService {
  private static wsServer: Server | null = null;

  private readonly logger = new MongoDBDynamicApiLogger(DynamicApiBroadcastService.name);

  setWsServer(server: Server): void {
    DynamicApiBroadcastService.wsServer = server;
  }

  broadcastFromHttp<T extends object>(
    event: string,
    data: T[],
    broadcastConfig: BroadcastConfig<T>,
  ): void {
    if (!DynamicApiBroadcastService.wsServer) {
      return;
    }

    try {
      const resolved = resolveBroadcast(event, data, broadcastConfig);

      if (!resolved) {
        return;
      }

      const { event: broadcastEvent, rooms, data: broadcastData } = resolved;

      if (rooms) {
        DynamicApiBroadcastService.wsServer.to(rooms).emit(broadcastEvent, broadcastData);
      } else {
        DynamicApiBroadcastService.wsServer.emit(broadcastEvent, broadcastData);
      }
    } catch (error) {
      // Covers both a throwing `rooms`/`enabled` resolver (inside resolveBroadcast) and a
      // throwing `emit()` — either way, the primary HTTP operation already succeeded and its
      // response must not be corrupted by a broadcast-only failure.
      this.logger.error(
        `[Broadcast] Failed to emit "${event}": ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}

