import { BaseEntity } from '@dynamic-api';

interface GetManyService<Entity extends BaseEntity> {
  getMany(query?: object): Promise<Entity[]>;
}

export type { GetManyService };
