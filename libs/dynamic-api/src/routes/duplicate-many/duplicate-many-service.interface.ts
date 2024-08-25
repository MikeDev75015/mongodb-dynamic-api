import { BaseEntity } from '../../models';

interface DuplicateManyService<Entity extends BaseEntity, Response = any> {
  duplicateMany(ids: string[], partial?: Partial<Entity>): Promise<(Entity | Response)[]>;
}

export type { DuplicateManyService };
