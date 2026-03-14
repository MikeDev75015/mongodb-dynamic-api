import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneController<Entity extends BaseEntity, Body = any, Response = any> {
  updateOne(id: string, partial: Body): Promise<Entity | Response>;
}

type UpdateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => UpdateOneController<Entity>;

export type { UpdateOneController, UpdateOneControllerConstructor };
