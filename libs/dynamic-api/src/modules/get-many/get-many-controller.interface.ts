import { BaseEntity } from '@dynamic-api';
import { GetManyService } from '@dynamic-api/modules';

interface GetManyController<Entity extends BaseEntity> {
  getMany(query?: object): Promise<Entity[]>;
}

type GetManyControllerConstructor<Entity extends BaseEntity> = new (
  service: GetManyService<Entity>,
) => GetManyController<Entity>;

export type { GetManyController, GetManyControllerConstructor };
