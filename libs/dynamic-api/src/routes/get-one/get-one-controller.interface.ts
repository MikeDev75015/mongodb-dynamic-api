import { BaseEntity } from '../../models';
import { GetOneService } from './get-one-service.interface';

interface GetOneController<Entity extends BaseEntity, Response = any> {
  getOne(id: string): Promise<Entity | Response>;
}

type GetOneControllerConstructor<Entity extends BaseEntity> = new (
  service: GetOneService<Entity>,
) => GetOneController<Entity>;

export type { GetOneController, GetOneControllerConstructor };
