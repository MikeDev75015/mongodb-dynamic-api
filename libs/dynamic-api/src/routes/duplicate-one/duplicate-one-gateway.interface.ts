import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneService } from './duplicate-one-service.interface';

interface DuplicateOneGateway<Entity extends BaseEntity, Body = any, Response = any> {
  duplicateOne(socket: ExtendedSocket, body: EntityParam & Body): GatewayResponse<Entity | Response>;
}

type DuplicateOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
  jwtService: JwtService,
) => DuplicateOneGateway<Entity>;

export type { DuplicateOneGateway, DuplicateOneGatewayConstructor };
