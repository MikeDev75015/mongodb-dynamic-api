import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { CreateOneService } from './create-one-service.interface';

interface CreateOneController<Entity extends BaseEntity, Response = any> {
  createOne<Body>(body: Body): Promise<Entity | Response>;
}

type CreateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => CreateOneController<Entity>;

export type { CreateOneController, CreateOneControllerConstructor };
