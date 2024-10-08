import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeleteOneService } from './delete-one-service.interface';

export abstract class BaseDeleteOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteOne(id: string): Promise<DeletePresenter> {
    try {
      let op: DeleteResult;

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

      return plainToInstance(DeletePresenter, { deletedCount: op.deletedCount });
    } catch (error: any) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }
  }
}
