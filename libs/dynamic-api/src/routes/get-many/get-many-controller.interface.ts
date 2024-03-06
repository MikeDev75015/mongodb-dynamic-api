import { BaseEntity } from '../../models';
import { GetManyService } from './get-many-service.interface';

interface GetManyController<Entity extends BaseEntity> {
  getMany(query?: object): Promise<Entity[]>;
}

type GetManyControllerConstructor<Entity extends BaseEntity> = new (
  service: GetManyService<Entity>,
) => GetManyController<Entity>;

export type { GetManyController, GetManyControllerConstructor };
