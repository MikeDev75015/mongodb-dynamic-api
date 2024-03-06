import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeletedCount, DeleteOneService } from './delete-one-service.interface';
import { DeleteOnePresenter } from './delete-one.presenter';

export abstract class BaseDeleteOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteOne(id: string): Promise<DeleteOnePresenter> {
    let op: DeletedCount;

    if (this.isSoftDeletable) {
      const deleted = await this.model
        .updateOne(
          {
            _id: id,
            isDeleted: false,
          },
          { $set: { isDeleted: true, deletedAt: Date.now() } },
        )
        .exec();

      op = { deletedCount: deleted.modifiedCount };
    } else {
      op = await this.model.deleteOne({ _id: id }).exec();
    }

    return Builder(DeleteOnePresenter).deletedCount(op.deletedCount).build();
  }
}
