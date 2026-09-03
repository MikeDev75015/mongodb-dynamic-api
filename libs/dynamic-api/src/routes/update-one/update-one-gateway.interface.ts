import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos/entity.param';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneGateway<Entity extends BaseEntity, Data = any, Response = any> {
  updateOne(socket: ExtendedSocket, body: EntityParam & Data): GatewayResponse<Entity | Response>;
}

type UpdateOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
  jwtService: JwtService,
) => UpdateOneGateway<Entity>;

export type { UpdateOneGateway, UpdateOneGatewayConstructor };
