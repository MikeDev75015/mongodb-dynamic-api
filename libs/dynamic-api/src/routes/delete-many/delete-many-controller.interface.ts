// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<Entity extends BaseEntity> {
  deleteMany(ids: string[]): Promise<DeleteResult>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
