import { BaseEntity } from '../../models';
import { CreateManyService } from './create-many-service.interface';

type CreateManyBody<T = any> = {
  list: Partial<T>[];
};

interface CreateManyController<Entity extends BaseEntity> {
  createMany(body: CreateManyBody<Entity>): Promise<Entity[]>;
}

type CreateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
) => CreateManyController<Entity>;

export type { CreateManyBody, CreateManyController, CreateManyControllerConstructor };
