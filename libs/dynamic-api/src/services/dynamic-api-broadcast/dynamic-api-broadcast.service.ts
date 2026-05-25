import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { resolveRooms } from '../../helpers';
import { BroadcastAbilityPredicate, BroadcastConfig } from '../../interfaces';

@Injectable()
/** @deprecated Internal API — will be removed from public exports in v5. */
export class DynamicApiBroadcastService {
  private static wsServer: Server | null = null;

  setWsServer(server: Server): void {
    DynamicApiBroadcastService.wsServer = server;
  }

  broadcastFromHttp<T extends object>(
    event: string,
    data: T[],
    broadcastConfig: BroadcastConfig<T>,
  ): void {
    if (!DynamicApiBroadcastService.wsServer || !broadcastConfig || !data?.length) {
      return;
    }

    const { enabled, eventName, rooms } = broadcastConfig;

    if (typeof enabled === 'boolean' && !enabled) {
      return;
    }

    const broadcastData = typeof enabled === 'function'
      ? data.filter((item) => (enabled as BroadcastAbilityPredicate<T>)(item, undefined))
      : data;

    if (!broadcastData.length) {
      return;
    }

    const broadcastEvent = eventName || event;
    const resolvedRooms = resolveRooms(rooms, broadcastData, undefined);

    if (resolvedRooms) {
      DynamicApiBroadcastService.wsServer.to(resolvedRooms).emit(broadcastEvent, broadcastData);
    } else {
      DynamicApiBroadcastService.wsServer.emit(broadcastEvent, broadcastData);
    }
  }
}

