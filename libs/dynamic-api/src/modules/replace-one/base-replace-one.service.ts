import { BaseEntity } from '@dynamic-api';
import { ReplaceOneService } from '@dynamic-api/modules';
import { BaseService } from '@dynamic-api/services';
import { Model } from 'mongoose';

export abstract class BaseReplaceOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements ReplaceOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async replaceOne(id: string, partial: Partial<Entity>): Promise<Entity> {
    try {
      const document = await this.model
        .findOneAndReplace(
          {
            _id: id,
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          },
          partial,
          {
            new: true,
            setDefaultsOnInsert: true,
          },
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
