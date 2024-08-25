import { BaseEntity } from '../../models';
import { DuplicateManyService } from './duplicate-many-service.interface';

interface DuplicateManyController<Entity extends BaseEntity, Response = any> {
  duplicateMany(ids: string[], body?: Partial<Entity>): Promise<(Entity | Response)[]>;
}

type DuplicateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateManyService<Entity>,
) => DuplicateManyController<Entity>;

export type { DuplicateManyController, DuplicateManyControllerConstructor };
