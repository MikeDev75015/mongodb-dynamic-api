import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';

interface DeleteManyService<Entity extends BaseEntity> {
  deleteMany(ids: string[]): Promise<DeleteResult>;
}

export type { DeleteManyService };
