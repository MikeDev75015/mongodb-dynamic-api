import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

interface UpdateManyController<Entity extends BaseEntity, Body = any, Response = any> {
  updateMany(ids: string[], partial: Body): Promise<(Entity | Response)[]>;
}

type UpdateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => UpdateManyController<Entity>;

export type { UpdateManyController, UpdateManyControllerConstructor };
