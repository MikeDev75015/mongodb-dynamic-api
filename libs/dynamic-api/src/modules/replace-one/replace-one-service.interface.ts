import { BaseEntity } from '@dynamic-api';

interface ReplaceOneService<Entity extends BaseEntity> {
  replaceOne(id: string, partial: Partial<Entity>): Promise<Entity>;
}

export type { ReplaceOneService };
