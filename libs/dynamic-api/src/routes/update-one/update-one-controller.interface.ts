import { BaseEntity } from '../../models';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneController<Entity extends BaseEntity> {
  updateOne(id: string, partial: Partial<Entity>): Promise<Entity | undefined>;
}

type UpdateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
) => UpdateOneController<Entity>;

export type { UpdateOneController, UpdateOneControllerConstructor };
