import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

export abstract class BaseUpdateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateManyService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async updateMany(ids: string[], partial: Partial<Entity>): Promise<Entity[]> {
    try {
      const toUpdateList = await this.model.find({ _id: { $in: ids } }).lean().exec();
      if (toUpdateList?.length !== ids.length) {
        this.handleDocumentNotFound();
      }

      await this.model
        .updateMany(
          {
            _id: { $in: ids },
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          },
          partial,
        )
        .lean()
        .exec();

      const documents = await this.model.find({ _id: { $in: ids } }).lean().exec();
      return documents.map((d) => this.buildInstance(d as Entity));
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
      throw error;
    }
  }
}
