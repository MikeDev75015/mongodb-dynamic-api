import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { resolveBroadcast } from '../../helpers';
import { BroadcastConfig } from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger';

@Injectable()
/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
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

    const resolved = resolveBroadcast(event, data, broadcastConfig);

    if (!resolved) {
      return;
    }

    const { event: broadcastEvent, rooms, data: broadcastData } = resolved;

    try {
      if (rooms) {
        DynamicApiBroadcastService.wsServer.to(rooms).emit(broadcastEvent, broadcastData);
      } else {
        DynamicApiBroadcastService.wsServer.emit(broadcastEvent, broadcastData);
      }
    } catch (error) {
      this.logger.error(
        `[Broadcast] Failed to emit "${broadcastEvent}": ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}

