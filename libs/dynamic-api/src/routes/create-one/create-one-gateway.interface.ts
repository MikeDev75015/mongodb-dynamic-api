import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneService } from './create-one-service.interface';

interface CreateOneGateway<Entity extends BaseEntity, Response = any> {
  createOne<Body>(socket: ExtendedSocket, body: Body): GatewayResponse<Entity | Response>;
}

type CreateOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
  jwtService: JwtService,
) => CreateOneGateway<Entity>;

export type { CreateOneGateway, CreateOneGatewayConstructor };
