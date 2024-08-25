import { BaseEntity } from '../../models';
import { CreateOneService } from './create-one-service.interface';

interface CreateOneController<Entity extends BaseEntity, Response = any> {
  createOne<Body>(body: Body): Promise<Entity | Response>;
}

type CreateOneControllerConstructor<Entity extends BaseEntity> = new (
  service: CreateOneService<Entity>,
) => CreateOneController<Entity>;

export type { CreateOneController, CreateOneControllerConstructor };
