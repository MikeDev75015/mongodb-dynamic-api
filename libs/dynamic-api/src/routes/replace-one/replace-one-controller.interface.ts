import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { ReplaceOneService } from './replace-one-service.interface';

interface ReplaceOneController<Entity extends BaseEntity, Body = any, Response = any> {
  replaceOne(id: string, body: Body): Promise<Entity | Response>;
}

type ReplaceOneControllerConstructor<Entity extends BaseEntity> = new (
  service: ReplaceOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => ReplaceOneController<Entity>;

export type { ReplaceOneController, ReplaceOneControllerConstructor };
