import { BaseEntity } from '../../models';
import { GetManyService } from './get-many-service.interface';

interface GetManyController<Entity extends BaseEntity, Query = any, Response = any> {
  getMany(query?: Query): Promise<(Entity | Response)[]>;
}

type GetManyControllerConstructor<Entity extends BaseEntity> = new (
  service: GetManyService<Entity>,
) => GetManyController<Entity>;

export type { GetManyController, GetManyControllerConstructor };
