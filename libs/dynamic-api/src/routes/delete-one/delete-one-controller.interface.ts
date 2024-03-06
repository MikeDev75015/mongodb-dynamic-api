// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BaseEntity } from '../../models';
import { DeletedCount, DeleteOneService } from './delete-one-service.interface';

interface DeleteOneController<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeletedCount>;
}

type DeleteOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
) => DeleteOneController<Entity>;

export type { DeleteOneController, DeleteOneControllerConstructor };
