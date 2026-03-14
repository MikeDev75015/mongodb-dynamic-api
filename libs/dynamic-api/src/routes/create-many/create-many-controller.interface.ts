import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { CreateManyService } from './create-many-service.interface';

type CreateManyBody<T = any> = {
  list: Partial<T>[];
};

interface CreateManyController<Entity extends BaseEntity, Response = any> {
  createMany(body: CreateManyBody<Entity>): Promise<(Entity | Response)[]>;
}

type CreateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => CreateManyController<Entity>;

export type { CreateManyBody, CreateManyController, CreateManyControllerConstructor };
