import { BaseEntity } from '@dynamic-api';
import { DuplicateOneService } from '@dynamic-api/modules';

interface DuplicateOneController<Entity extends BaseEntity> {
  duplicateOne(id: string, partial: Partial<Entity>): Promise<Entity>;
}

type DuplicateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DuplicateOneService<Entity>,
) => DuplicateOneController<Entity>;

export type { DuplicateOneController, DuplicateOneControllerConstructor };
