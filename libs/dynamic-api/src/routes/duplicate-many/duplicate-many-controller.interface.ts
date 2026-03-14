import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DuplicateManyService } from './duplicate-many-service.interface';

interface DuplicateManyController<Entity extends BaseEntity, Body = any, Response = any> {
  duplicateMany(ids: string[], body?: Body): Promise<(Entity | Response)[]>;
}

type DuplicateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateManyService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
) => DuplicateManyController<Entity>;

export type { DuplicateManyController, DuplicateManyControllerConstructor };
