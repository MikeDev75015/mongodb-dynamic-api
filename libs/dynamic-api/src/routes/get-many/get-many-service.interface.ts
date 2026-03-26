import { BaseEntity } from '../../models';

interface GetManyService<Entity extends BaseEntity> {
  getMany(query?: object, user?: unknown): Promise<Entity[]>;
}

export type { GetManyService };
