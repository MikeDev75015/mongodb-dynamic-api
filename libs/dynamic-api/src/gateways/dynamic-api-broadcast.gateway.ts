import { Inject, UseFilters, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DynamicAPIWsExceptionFilter } from '../filters';
import { JwtSocketGuard } from '../guards';
import { ExtendedSocket, GatewayOptions } from '../interfaces';
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

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard())
    @SubscribeMessage('join-rooms')
    joinRooms(
      @ConnectedSocket() socket: ExtendedSocket,
      @MessageBody() { rooms }: { rooms: string | string[] },
    ) {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];
      roomList.forEach((room) => socket.join(room));
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
      return { event: 'leave-rooms', data: roomList };
    }
  }

  return DynamicApiBroadcastGateway;
}

export { createDynamicApiBroadcastGateway };

