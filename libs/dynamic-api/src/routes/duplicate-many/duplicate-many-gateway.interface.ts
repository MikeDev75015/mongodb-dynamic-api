import { JwtService } from '@nestjs/jwt';
import { ManyEntityQuery } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateManyService } from './duplicate-many-service.interface';

interface DuplicateManyGateway<Entity extends BaseEntity> {
  duplicateMany(socket: ExtendedSocket, body: ManyEntityQuery & Partial<Entity>): GatewayResponse<Entity[]>;
}

type DuplicateManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: DuplicateManyService<Entity>,
  jwtService: JwtService,
) => DuplicateManyGateway<Entity>;

export type { DuplicateManyGateway, DuplicateManyGatewayConstructor };
