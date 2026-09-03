import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { CreateManyBody } from './create-many-controller.interface';
import { CreateManyService } from './create-many-service.interface';

interface CreateManyGateway<Entity extends BaseEntity, Response = any> {
  createMany(socket: ExtendedSocket, body: CreateManyBody<Entity>): GatewayResponse<(Entity | Response)[]>;
}

type CreateManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
  jwtService: JwtService,
) => CreateManyGateway<Entity>;

export type { CreateManyGateway, CreateManyGatewayConstructor };
