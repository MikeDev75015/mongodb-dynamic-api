import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeletedCount } from '../delete-one';
import { DeleteManyService } from './delete-many-service.interface';

export abstract class BaseDeleteManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteManyService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteMany(ids: string[]): Promise<DeletePresenter> {
    let op: DeletedCount;

    if (this.isSoftDeletable) {
      const deleted = await this.model
        .updateMany(
          {
            _id: { $in: ids },
            isDeleted: false,
          },
          { $set: { isDeleted: true, deletedAt: Date.now() } },
        )
        .exec();

      op = { deletedCount: deleted.modifiedCount };
    } else {
      op = await this.model.deleteMany({ _id: { $in: ids } }).exec();
    }

    return Builder(DeletePresenter).deletedCount(op.deletedCount).build();
  }
}
