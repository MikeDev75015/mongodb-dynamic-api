import { BaseEntity } from '@dynamic-api';

interface CreateOneService<Entity extends BaseEntity> {
  createOne(partial: Partial<Entity>): Promise<Entity>;
}

export type { CreateOneService };
