import { BaseEntity } from '../../models';

interface GetManyService<Entity extends BaseEntity> {
  getMany(query?: object): Promise<Entity[]>;
}

export type { GetManyService };
