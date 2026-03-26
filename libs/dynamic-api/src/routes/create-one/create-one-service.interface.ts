import { BaseEntity } from '../../models';

interface CreateOneService<Entity extends BaseEntity> {
  createOne(partial: Partial<Entity>, user?: unknown): Promise<Entity>;
}

export type { CreateOneService };
