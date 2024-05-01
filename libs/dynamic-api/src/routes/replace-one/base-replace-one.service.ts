import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { ReplaceOneService } from './replace-one-service.interface';

export abstract class BaseReplaceOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements ReplaceOneService<Entity>
{
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

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

      if (this.callback) {
        await this.callback(document as Entity, this.callbackMethods);
      }

      return this.buildInstance(document as Entity);
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
    }
  }
}
