import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { DynamicApiBroadcastConfig } from '../../interfaces';

@Injectable()
export class DynamicApiBroadcastService {
  private wsServer: Server | null = null;

  setWsServer(server: Server): void {
    this.wsServer = server;
  }

  broadcastFromHttp<T extends object>(
    event: string,
    data: T[],
    broadcastConfig: DynamicApiBroadcastConfig<T>,
  ): void {
    if (!this.wsServer || !broadcastConfig || !data?.length) {
      return;
    }

    const { enabled, eventName } = broadcastConfig;

    if (typeof enabled === 'boolean' && !enabled) {
      return;
    }

    const broadcastData = typeof enabled === 'function'
      ? data.filter((item) => (enabled as Function)(item, undefined))
      : data;

    if (!broadcastData.length) {
      return;
    }

    this.wsServer.emit(eventName || event, broadcastData);
  }
}

