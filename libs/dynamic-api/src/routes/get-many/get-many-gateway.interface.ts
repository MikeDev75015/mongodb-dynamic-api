import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyService } from './get-many-service.interface';

interface GetManyGateway<Entity extends BaseEntity, Response = any> {
  getMany(socket: ExtendedSocket, body?: object): GatewayResponse<(Entity | Response)[]>;
}

type GetManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: GetManyService<Entity>,
  jwtService: JwtService,
) => GetManyGateway<Entity>;

export type { GetManyGateway, GetManyGatewayConstructor };
