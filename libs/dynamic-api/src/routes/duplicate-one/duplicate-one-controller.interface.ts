import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DuplicateOneService } from './duplicate-one-service.interface';

interface DuplicateOneController<Entity extends BaseEntity, Body = unknown, Response = unknown> {
  duplicateOne(id: string, body?: Body, req?: DynamicApiRequest): Promise<Entity | Response>;
}

type DuplicateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => DuplicateOneController<Entity>;

export type { DuplicateOneController, DuplicateOneControllerConstructor };
