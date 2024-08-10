import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneGateway<Entity extends BaseEntity> {
  updateOne(socket: ExtendedSocket, body: EntityParam & Partial<Entity>): GatewayResponse<Entity | undefined>;
}

type UpdateOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
  jwtService: JwtService,
) => UpdateOneGateway<Entity>;

export type { UpdateOneGateway, UpdateOneGatewayConstructor };
