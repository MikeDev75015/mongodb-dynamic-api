import { JwtService } from '@nestjs/jwt';
import { DeletePresenter, EntityParam } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneService } from './delete-one-service.interface';

interface DeleteOneGateway<Entity extends BaseEntity> {
  deleteOne(socket: ExtendedSocket, body: EntityParam): GatewayResponse<DeletePresenter>;
}

type DeleteOneGatewayConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
  jwtService: JwtService,
) => DeleteOneGateway<Entity>;

export type { DeleteOneGateway, DeleteOneGatewayConstructor };
