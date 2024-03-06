import { BaseEntity } from '../../models';
import { CreateManyService } from './create-many-service.interface';

interface CreateManyController<Entity extends BaseEntity> {
  createMany(body: { list: any }): Promise<Entity[]>;
}

type CreateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
) => CreateManyController<Entity>;

export type { CreateManyController, CreateManyControllerConstructor };
