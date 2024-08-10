import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetOneService } from './get-one-service.interface';

interface GetOneGateway<Entity extends BaseEntity> {
  getOne(socket: ExtendedSocket, body: EntityParam): GatewayResponse<Entity | undefined>;
}

type GetOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: GetOneService<Entity>,
  jwtService: JwtService,
) => GetOneGateway<Entity>;

export type { GetOneGateway, GetOneGatewayConstructor };
