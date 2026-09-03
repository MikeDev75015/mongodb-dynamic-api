import { JwtService } from '@nestjs/jwt';
import { ManyEntityQuery } from '../../dtos/many-entity.query';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { UpdateManyService } from './update-many-service.interface';

interface UpdateManyGateway<Entity extends BaseEntity, Data = any, Response = any> {
  updateMany(socket: ExtendedSocket, body: ManyEntityQuery & Data): GatewayResponse<(Entity | Response)[]>;
}

type UpdateManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: UpdateManyService<Entity>,
  jwtService: JwtService,
) => UpdateManyGateway<Entity>;

export type { UpdateManyGateway, UpdateManyGatewayConstructor };
