import { BaseEntity } from '@dynamic-api';
import { CreateManyService } from '@dynamic-api/modules';

interface CreateManyController<Entity extends BaseEntity> {
  createMany<Body>(body: Body): Promise<Entity[]>;
}

type CreateManyControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateManyService<Entity>,
) => CreateManyController<Entity>;

export type { CreateManyController, CreateManyControllerConstructor };
