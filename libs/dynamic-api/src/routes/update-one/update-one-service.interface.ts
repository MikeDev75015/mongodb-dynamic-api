import { BaseEntity } from '../../models';

interface UpdateOneService<Entity extends BaseEntity> {
  updateOne(id: string, partial: Partial<Entity>, user?: unknown): Promise<Entity>;
}

export type { UpdateOneService };
