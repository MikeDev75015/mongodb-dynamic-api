import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyService } from './get-many-service.interface';

interface GetManyController<Entity extends BaseEntity, Query = unknown, Response = unknown> {
  getMany(query?: Query, req?: DynamicApiRequest): Promise<(Entity | Response)[]>;
}

type GetManyControllerConstructor<Entity extends BaseEntity> = new (
  service: GetManyService<Entity>,
) => GetManyController<Entity>;

export type { GetManyController, GetManyControllerConstructor };
