import { ManyEntityQuery } from '../../dtos/many-entity.query';
import { DeleteResult, DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<_Entity extends BaseEntity, Response = unknown> {
  deleteMany(query: ManyEntityQuery, req?: DynamicApiRequest): Promise<DeleteResult | Response>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
