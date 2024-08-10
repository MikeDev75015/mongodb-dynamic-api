import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneService } from './duplicate-one-service.interface';

interface DuplicateOneGateway<Entity extends BaseEntity> {
  duplicateOne(socket: ExtendedSocket, body: EntityParam & Partial<Entity>): GatewayResponse<Entity>;
}

type DuplicateOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
  jwtService: JwtService,
) => DuplicateOneGateway<Entity>;

export type { DuplicateOneGateway, DuplicateOneGatewayConstructor };
