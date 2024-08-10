import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyBody } from './create-many-controller.interface';
import { CreateManyService } from './create-many-service.interface';

interface CreateManyGateway<Entity extends BaseEntity> {
  createMany(socket: ExtendedSocket, body: CreateManyBody<Entity>): GatewayResponse<Entity[]>;
}

type CreateManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
  jwtService: JwtService,
) => CreateManyGateway<Entity>;

export type { CreateManyGateway, CreateManyGatewayConstructor };
