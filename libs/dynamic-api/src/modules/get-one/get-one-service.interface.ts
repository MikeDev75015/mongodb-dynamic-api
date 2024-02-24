import { BaseEntity } from '@dynamic-api';

interface GetOneService<Entity extends BaseEntity> {
  getOne(id: string): Promise<Entity>;
}

export type { GetOneService };
