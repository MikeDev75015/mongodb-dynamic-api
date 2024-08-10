import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneService } from './replace-one-service.interface';

interface ReplaceOneGateway<Entity extends BaseEntity> {
  replaceOne(socket: ExtendedSocket, body: EntityParam & Partial<Entity>): GatewayResponse<Entity>;
}

type ReplaceOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: ReplaceOneService<Entity>,
  jwtService: JwtService,
) => ReplaceOneGateway<Entity>;

export type { ReplaceOneGateway, ReplaceOneGatewayConstructor };
