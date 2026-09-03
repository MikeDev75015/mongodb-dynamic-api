import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { CreateOneService } from './create-one-service.interface';

interface CreateOneController<Entity extends BaseEntity, Response = unknown> {
  createOne<Body>(body: Body, req?: DynamicApiRequest): Promise<Entity | Response>;
}

type CreateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => CreateOneController<Entity>;

export type { CreateOneController, CreateOneControllerConstructor };
