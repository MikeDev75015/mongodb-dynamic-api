import { BaseEntity } from '../../models';

interface CreateManyService<Entity extends BaseEntity> {
  createMany(partial: Partial<Entity>[], user?: unknown): Promise<Entity[]>;
}

export type { CreateManyService };
