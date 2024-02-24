import { BaseEntity } from '@dynamic-api';
import { UpdateOneService } from '@dynamic-api/modules';

interface UpdateOneController<Entity extends BaseEntity> {
  updateOne(id: string, partial: Partial<Entity>): Promise<Entity | undefined>;
}

type UpdateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
) => UpdateOneController<Entity>;

export type { UpdateOneController, UpdateOneControllerConstructor };
