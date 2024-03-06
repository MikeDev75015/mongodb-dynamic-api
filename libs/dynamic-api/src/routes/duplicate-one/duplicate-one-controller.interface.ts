import { BaseEntity } from '../../models';
import { DuplicateOneService } from './duplicate-one-service.interface';

interface DuplicateOneController<Entity extends BaseEntity> {
  duplicateOne(id: string, body?: Partial<Entity>): Promise<Entity>;
}

type DuplicateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
) => DuplicateOneController<Entity>;

export type { DuplicateOneController, DuplicateOneControllerConstructor };
