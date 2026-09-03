import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneController<Entity extends BaseEntity, Body = unknown, Response = unknown> {
  updateOne(id: string, partial: Body, req?: DynamicApiRequest): Promise<Entity | Response>;
}

type UpdateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => UpdateOneController<Entity>;

export type { UpdateOneController, UpdateOneControllerConstructor };
