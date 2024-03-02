import { BaseEntity } from '../../models';

interface DuplicateOneService<Entity extends BaseEntity> {
  duplicateOne(id: string, partial: Partial<Entity> | undefined): Promise<Entity>;
}

export type { DuplicateOneService };
