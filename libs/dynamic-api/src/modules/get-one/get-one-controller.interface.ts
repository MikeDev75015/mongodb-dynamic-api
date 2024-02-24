import { BaseEntity } from '@dynamic-api';
import { GetOneService } from '@dynamic-api/modules';

interface GetOneController<Entity extends BaseEntity> {
  getOne(id: string): Promise<Entity>;
}

type GetOneControllerConstructor<Entity extends BaseEntity> = new (
  service: GetOneService<Entity>,
) => GetOneController<Entity>;

export type { GetOneController, GetOneControllerConstructor };
