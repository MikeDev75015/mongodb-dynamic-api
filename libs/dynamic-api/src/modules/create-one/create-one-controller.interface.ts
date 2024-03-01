import { BaseEntity } from '../../models';
import { CreateOneService } from './create-one-service.interface';

interface CreateOneController<Entity extends BaseEntity> {
  createOne<Body>(body: Body): Promise<Entity | undefined>;
}

type CreateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
) => CreateOneController<Entity>;

export type { CreateOneController, CreateOneControllerConstructor };
