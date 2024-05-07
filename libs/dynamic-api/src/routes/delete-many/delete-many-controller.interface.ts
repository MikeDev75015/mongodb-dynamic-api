// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeleteManyEntityQuery, DeletePresenter } from '../../dtos';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<Entity extends BaseEntity> {
  deleteMany(query: DeleteManyEntityQuery): Promise<DeletePresenter>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
