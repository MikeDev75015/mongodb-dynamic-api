import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos/entity.param';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { GetOneService } from './get-one-service.interface';

interface GetOneGateway<Entity extends BaseEntity, Response = any> {
  getOne(socket: ExtendedSocket, body: EntityParam): GatewayResponse<Entity | Response>;
}

type GetOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: GetOneService<Entity>,
  jwtService: JwtService,
) => GetOneGateway<Entity>;

export type { GetOneGateway, GetOneGatewayConstructor };
