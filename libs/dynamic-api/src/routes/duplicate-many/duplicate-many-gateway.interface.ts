import { JwtService } from '@nestjs/jwt';
import { ManyEntityQuery } from '../../dtos/many-entity.query';
import { ExtendedSocket } from '../../interfaces';
import { GatewayResponse } from '../../interfaces/dynamic-api-web-socket.interface';
import { BaseEntity } from '../../models';
import { DuplicateManyService } from './duplicate-many-service.interface';

interface DuplicateManyGateway<Entity extends BaseEntity, Response = any> {
  duplicateMany(
    socket: ExtendedSocket,
    body: ManyEntityQuery & Partial<Entity>,
  ): GatewayResponse<(Entity | Response)[]>;
}

type DuplicateManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: DuplicateManyService<Entity>,
  jwtService: JwtService,
) => DuplicateManyGateway<Entity>;

export type { DuplicateManyGateway, DuplicateManyGatewayConstructor };
