import { BaseEntity } from '@dynamic-api';

interface DuplicateOneService<Entity extends BaseEntity> {
  duplicateOne(id: string, partial: Partial<Entity>): Promise<Entity>;
}

export type { DuplicateOneService };
