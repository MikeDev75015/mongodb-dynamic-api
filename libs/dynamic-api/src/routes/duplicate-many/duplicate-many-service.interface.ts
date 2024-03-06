import { BaseEntity } from '../../models';

interface DuplicateManyService<Entity extends BaseEntity> {
  duplicateMany(ids: string[], partial: Partial<Entity> | undefined): Promise<Entity[]>;
}

export type { DuplicateManyService };
