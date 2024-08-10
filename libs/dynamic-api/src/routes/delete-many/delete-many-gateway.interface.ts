// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtService } from '@nestjs/jwt';
import { ManyEntityQuery, DeletePresenter } from '../../dtos';
import { ExtendedSocket, GatewayResponse } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyGateway<Entity extends BaseEntity> {
  deleteMany(socket: ExtendedSocket, body: ManyEntityQuery): GatewayResponse<DeletePresenter>;
}

type DeleteManyGatewayConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
  jwtService: JwtService,
) => DeleteManyGateway<Entity>;

export type { DeleteManyGateway, DeleteManyGatewayConstructor };
