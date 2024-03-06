import { BaseEntity } from '../../models';

type DeletedCount = { deletedCount: number };

interface DeleteOneService<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeletedCount>;
}

export type { DeletedCount, DeleteOneService };
