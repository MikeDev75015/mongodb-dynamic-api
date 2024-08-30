import { BaseEntity } from '../../models';
import { DuplicateOneService } from './duplicate-one-service.interface';

interface DuplicateOneController<Entity extends BaseEntity, Body = any, Response = any> {
  duplicateOne(id: string, body?: Body): Promise<Entity | Response>;
}

type DuplicateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
) => DuplicateOneController<Entity>;

export type { DuplicateOneController, DuplicateOneControllerConstructor };
