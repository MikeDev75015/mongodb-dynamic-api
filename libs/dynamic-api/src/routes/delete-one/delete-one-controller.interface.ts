// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeletePresenter } from '../../dtos';
import { BaseEntity } from '../../models';
import { DeleteOneService } from './delete-one-service.interface';

interface DeleteOneController<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeletePresenter>;
}

type DeleteOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
) => DeleteOneController<Entity>;

export type { DeleteOneController, DeleteOneControllerConstructor };
