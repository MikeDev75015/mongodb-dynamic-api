import { Model } from 'mongoose';
import { AfterSaveCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetOneService } from './get-one-service.interface';

export abstract class BaseGetOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetOneService<Entity> {
  protected readonly callback: AfterSaveCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getOne(id: string): Promise<Entity> {
    try {
      const document = await this.model
      .findOne({
        _id: id,
        ...(
          this.isSoftDeletable ? { isDeleted: false } : undefined
        ),
      })
      .lean<Entity>()
      .exec();

      if (!document) {
        this.handleDocumentNotFound();
      }

      if (this.callback) {
        await this.callback(this.addDocumentId(document), this.callbackMethods);
      }

      return this.buildInstance(document);
    } catch (error) {
      this.handleMongoErrors(error);
    }
  }
}
