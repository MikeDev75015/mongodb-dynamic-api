import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

export abstract class BaseUpdateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateManyService<Entity>
{
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

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

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(document as Entity, this.callbackMethods),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d as Entity));
    } catch (error: any) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
