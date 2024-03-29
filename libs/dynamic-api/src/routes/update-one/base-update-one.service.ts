import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateOneService } from './update-one-service.interface';

export abstract class BaseUpdateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async updateOne(id: string, partial: Partial<Entity>): Promise<Entity> {
    try {
      const document = await this.model
        .findOneAndUpdate(
          {
            _id: id,
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          },
          partial,
          { new: true },
        )
        .lean()
        .exec();

      if (!document) {
        this.handleDocumentNotFound();
      }

      return this.buildInstance(document as Entity);
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
      throw error;
    }
  }
}
