import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetOneService } from './get-one-service.interface';

export abstract class BaseGetOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetOneService<Entity>
{
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getOne(id: string): Promise<Entity> {
    try {
      const document = await this.model
      .findOne({
        _id: id,
        ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
      })
      .lean()
      .exec();

      if (!document) {
        this.handleDocumentNotFound();
      }

      if (this.callback) {
        await this.callback(document as Entity, this.callbackMethods);
      }

      return this.buildInstance(document as Entity);
    } catch (error) {
      this.handleCastError(error);
    }
  }
}
