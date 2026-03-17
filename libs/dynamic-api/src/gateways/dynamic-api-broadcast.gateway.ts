import { Inject, UseFilters, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DynamicAPIWsExceptionFilter } from '../filters';
import { JwtSocketGuard } from '../guards';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { ExtendedSocket, GatewayOptions } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger';
import { DynamicApiBroadcastService } from '../services';

function createDynamicApiBroadcastGateway(options: GatewayOptions = {}) {
  @WebSocketGateway(options)
  class DynamicApiBroadcastGateway implements OnGatewayInit {
    /** @internal */
    readonly logger = new MongoDBDynamicApiLogger('DynamicApiBroadcastGateway');

    @WebSocketServer()
    readonly server: Server;

    constructor(
      @Inject(DynamicApiBroadcastService)
      readonly broadcastService: DynamicApiBroadcastService,
    ) {}

    afterInit(server: Server) {
      this.broadcastService.setWsServer(server);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard())
    @SubscribeMessage('join-rooms')
    joinRooms(
      @ConnectedSocket() socket: ExtendedSocket,
      @MessageBody() { rooms }: { rooms: string | string[] },
    ) {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];
      roomList.forEach((room) => socket.join(room));

      if (DynamicApiWsConfigStore.debug) {
        this.logger.log(`[WS] joinRooms – socket=${socket.id}, rooms=${JSON.stringify(roomList)}`);
      }

      return { event: 'join-rooms', data: roomList };
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard())
    @SubscribeMessage('leave-rooms')
    leaveRooms(
      @ConnectedSocket() socket: ExtendedSocket,
      @MessageBody() { rooms }: { rooms: string | string[] },
    ) {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];
      roomList.forEach((room) => socket.leave(room));

      if (DynamicApiWsConfigStore.debug) {
        this.logger.log(`[WS] leaveRooms – socket=${socket.id}, rooms=${JSON.stringify(roomList)}`);
      }

      return { event: 'leave-rooms', data: roomList };
    }
  }

  return DynamicApiBroadcastGateway;
}

export { createDynamicApiBroadcastGateway };

