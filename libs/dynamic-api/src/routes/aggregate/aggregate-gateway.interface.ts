import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { AggregateService } from './aggregate-service.interface';

interface AggregateGateway<Entity extends BaseEntity, Data = any, Response = any> {
  aggregate(socket: ExtendedSocket, body: Data): GatewayResponse<Entity[] | Response[] | Response>;
}

type AggregateGatewayConstructor<Entity extends BaseEntity> = new (
  service: AggregateService<Entity>,
  jwtService: JwtService,
) => AggregateGateway<Entity>;

export type { AggregateGateway, AggregateGatewayConstructor };
