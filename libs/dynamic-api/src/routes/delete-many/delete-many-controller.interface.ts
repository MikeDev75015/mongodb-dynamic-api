import { ManyEntityQuery } from '../../dtos';
import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<_Entity extends BaseEntity, Response = any> {
  deleteMany(query: ManyEntityQuery): Promise<DeleteResult | Response>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
