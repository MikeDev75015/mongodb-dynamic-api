// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BaseEntity } from '../../models';
import { DeletedCount } from '../delete-one';
import { DeleteManyService } from './delete-many-service.interface';

interface DeleteManyController<Entity extends BaseEntity> {
  deleteMany(ids: string[]): Promise<DeletedCount>;
}

type DeleteManyControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteManyService<Entity>,
) => DeleteManyController<Entity>;

export type { DeleteManyController, DeleteManyControllerConstructor };
