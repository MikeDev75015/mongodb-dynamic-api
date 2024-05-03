// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneService } from './delete-one-service.interface';

interface DeleteOneController<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeleteResult>;
}

type DeleteOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
) => DeleteOneController<Entity>;

export type { DeleteOneController, DeleteOneControllerConstructor };
