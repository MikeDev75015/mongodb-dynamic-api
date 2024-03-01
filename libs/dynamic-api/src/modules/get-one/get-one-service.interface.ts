import { BaseEntity } from '../../models';

interface GetOneService<Entity extends BaseEntity> {
  getOne(id: string): Promise<Entity>;
}

export type { GetOneService };
