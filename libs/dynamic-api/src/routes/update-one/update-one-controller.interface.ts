import { BaseEntity } from '../../models';
import { UpdateOneService } from './update-one-service.interface';

interface UpdateOneController<Entity extends BaseEntity, Body = any, Response = any> {
  updateOne(id: string, partial: Body): Promise<Entity | Response>;
}

type UpdateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: UpdateOneService<Entity>,
) => UpdateOneController<Entity>;

export type { UpdateOneController, UpdateOneControllerConstructor };
