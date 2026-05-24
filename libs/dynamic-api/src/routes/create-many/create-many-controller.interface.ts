import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { CreateManyService } from './create-many-service.interface';

type CreateManyBody<T = unknown> = {
  list: Partial<T>[];
};

interface CreateManyController<Entity extends BaseEntity, Response = unknown> {
  createMany(body: CreateManyBody<Entity>, req?: DynamicApiRequest): Promise<(Entity | Response)[]>;
}

type CreateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => CreateManyController<Entity>;

export type { CreateManyBody, CreateManyController, CreateManyControllerConstructor };
