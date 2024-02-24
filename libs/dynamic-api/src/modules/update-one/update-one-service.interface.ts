import { BaseEntity } from '@dynamic-api';

interface UpdateOneService<Entity extends BaseEntity> {
  updateOne(id: string, partial: Partial<Entity>): Promise<Entity>;
}

export type { UpdateOneService };
