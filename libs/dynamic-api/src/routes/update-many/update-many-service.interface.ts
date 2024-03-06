import { BaseEntity } from '../../models';

interface UpdateManyService<Entity extends BaseEntity> {
  updateMany(ids: string[], partial: Partial<Entity>): Promise<Entity[]>;
}

export type { UpdateManyService };
