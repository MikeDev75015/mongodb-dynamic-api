import { JwtService } from '@nestjs/jwt';
import { EntityParam } from '../../dtos';
import { DeleteResult, ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneService } from './delete-one-service.interface';

interface DeleteOneGateway<_Entity extends BaseEntity, Response = any> {
  deleteOne(socket: ExtendedSocket, body: EntityParam): GatewayResponse<DeleteResult | Response>;
}

type DeleteOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
  jwtService: JwtService,
) => DeleteOneGateway<Entity>;

export type { DeleteOneGateway, DeleteOneGatewayConstructor };
