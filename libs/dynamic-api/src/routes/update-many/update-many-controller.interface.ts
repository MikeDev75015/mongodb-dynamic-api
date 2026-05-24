import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

interface UpdateManyController<Entity extends BaseEntity, Body = unknown, Response = unknown> {
  updateMany(ids: string[], partial: Body, req?: DynamicApiRequest): Promise<(Entity | Response)[]>;
}

type UpdateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => UpdateManyController<Entity>;

export type { UpdateManyController, UpdateManyControllerConstructor };
