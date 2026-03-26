import { BaseEntity } from '../../models';

interface DuplicateOneService<Entity extends BaseEntity> {
  duplicateOne(id: string, partial: Partial<Entity> | undefined, user?: unknown): Promise<Entity>;
}

export type { DuplicateOneService };
