import { JwtService } from '@nestjs/jwt';
import { ManyEntityQuery } from '../../dtos';
import { DeleteResult, ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyGateway<_Entity extends BaseEntity, Response = any> {
  deleteMany(socket: ExtendedSocket, body: ManyEntityQuery): GatewayResponse<(DeleteResult | Response)>;
}

type DeleteManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
  jwtService: JwtService,
) => DeleteManyGateway<Entity>;

export type { DeleteManyGateway, DeleteManyGatewayConstructor };
