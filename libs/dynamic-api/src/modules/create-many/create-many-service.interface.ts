import { BaseEntity } from '@dynamic-api';

interface CreateManyService<Entity extends BaseEntity> {
  createMany(partial: Partial<Entity>[]): Promise<Entity[]>;
}

export type { CreateManyService };
