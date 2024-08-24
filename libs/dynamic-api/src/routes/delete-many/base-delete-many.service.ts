import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { DeleteResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeleteManyService } from './delete-many-service.interface';

export abstract class BaseDeleteManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteManyService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteMany(ids: string[]): Promise<DeletePresenter> {
    try {
      let op: DeleteResult;

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

      return plainToInstance(DeletePresenter, { deletedCount: op.deletedCount });
    } catch (error: any) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }
  }
}
