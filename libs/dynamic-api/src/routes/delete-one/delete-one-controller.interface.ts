import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DeleteOneService } from './delete-one-service.interface';

interface DeleteOneController<_Entity extends BaseEntity, Response = any> {
  deleteOne(id: string): Promise<DeleteResult | Response>;
}

type DeleteOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => DeleteOneController<Entity>;

export type { DeleteOneController, DeleteOneControllerConstructor };
