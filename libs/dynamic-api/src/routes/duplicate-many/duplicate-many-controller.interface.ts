import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { DuplicateManyService } from './duplicate-many-service.interface';

interface DuplicateManyController<Entity extends BaseEntity, Body = unknown, Response = unknown> {
  duplicateMany(ids: string[], body?: Body, req?: DynamicApiRequest): Promise<(Entity | Response)[]>;
}

type DuplicateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => DuplicateManyController<Entity>;

export type { DuplicateManyController, DuplicateManyControllerConstructor };
