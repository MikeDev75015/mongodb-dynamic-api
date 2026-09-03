import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos/entity.param';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
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
