import { BaseEntity } from '@dynamic-api';
import { CreateOneService } from '@dynamic-api/modules';

interface CreateOneController<Entity extends BaseEntity> {
  createOne<Body>(body: Body): Promise<Entity | undefined>;
}

type CreateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
) => CreateOneController<Entity>;

export type { CreateOneController, CreateOneControllerConstructor };
