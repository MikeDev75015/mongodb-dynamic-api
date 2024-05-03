import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';

interface DeleteOneService<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeleteResult>;
}

export type { DeleteOneService };
