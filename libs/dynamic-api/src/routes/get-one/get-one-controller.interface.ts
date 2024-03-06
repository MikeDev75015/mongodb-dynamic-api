import { BaseEntity } from '../../models';
import { GetOneService } from './get-one-service.interface';

interface GetOneController<Entity extends BaseEntity> {
  getOne(id: string): Promise<Entity>;
}

type GetOneControllerConstructor<Entity extends BaseEntity> = new (
  service: GetOneService<Entity>,
) => GetOneController<Entity>;

export type { GetOneController, GetOneControllerConstructor };
