import { BaseEntity } from '../../models';

interface UpdateManyService<Entity extends BaseEntity> {
  updateMany(ids: string[], partial: Partial<Entity>, user?: unknown): Promise<Entity[]>;
}

export type { UpdateManyService };
