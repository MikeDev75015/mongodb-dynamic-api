import { BaseEntity } from '../../models';

interface GetOneService<Entity extends BaseEntity> {
  getOne(id: string, user?: unknown): Promise<Entity>;
}

export type { GetOneService };
