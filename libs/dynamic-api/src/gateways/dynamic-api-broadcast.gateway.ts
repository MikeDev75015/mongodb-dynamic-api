import { Inject } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GatewayOptions } from '../interfaces';
import { DynamicApiBroadcastService } from '../services';

function createDynamicApiBroadcastGateway(options: GatewayOptions = {}) {
  @WebSocketGateway(options)
  class DynamicApiBroadcastGateway implements OnGatewayInit {
    @WebSocketServer()
    readonly server: Server;

    constructor(
      @Inject(DynamicApiBroadcastService)
      readonly broadcastService: DynamicApiBroadcastService,
    ) {}

    afterInit(server: Server) {
      this.broadcastService.setWsServer(server);
    }
  }

  return DynamicApiBroadcastGateway;
}

export { createDynamicApiBroadcastGateway };

