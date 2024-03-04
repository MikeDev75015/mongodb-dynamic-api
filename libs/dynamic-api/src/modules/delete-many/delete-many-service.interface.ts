import { BaseEntity } from '../../models';
import { DeletedCount } from '../delete-one';

interface DeleteManyService<Entity extends BaseEntity> {
  deleteMany(ids: string[]): Promise<DeletedCount>;
}

export type { DeleteManyService };
