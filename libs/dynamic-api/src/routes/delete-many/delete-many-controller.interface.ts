// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ManyEntityQuery, DeletePresenter } from '../../dtos';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<Entity extends BaseEntity> {
  deleteMany(query: ManyEntityQuery): Promise<DeletePresenter>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
