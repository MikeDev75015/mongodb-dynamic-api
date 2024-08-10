import { GatewayMetadata } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseEntity } from '../models';

interface ExtendedSocket<Entity extends BaseEntity = any> extends Socket {
  user?: Entity;
}

type GatewayResponse<Data> = Promise<{ event: string; data: Data }>;

type GatewayOptions = GatewayMetadata;

type DynamicApiWebSocketOptions = GatewayOptions | boolean;

export type { DynamicApiWebSocketOptions, ExtendedSocket, GatewayOptions, GatewayResponse };
