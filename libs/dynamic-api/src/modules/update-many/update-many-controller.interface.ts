import { BaseEntity } from '../../models';
import { UpdateManyService } from './update-many-service.interface';

interface UpdateManyController<Entity extends BaseEntity> {
  updateMany(ids: string[], partial: Partial<Entity>): Promise<Entity[]>;
}

type UpdateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateManyService<Entity>,
) => UpdateManyController<Entity>;

export type { UpdateManyController, UpdateManyControllerConstructor };
