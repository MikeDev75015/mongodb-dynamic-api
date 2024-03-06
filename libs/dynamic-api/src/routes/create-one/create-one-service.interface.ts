import { BaseEntity } from '../../models';

interface CreateOneService<Entity extends BaseEntity> {
  createOne(partial: Partial<Entity>): Promise<Entity>;
}

export type { CreateOneService };
