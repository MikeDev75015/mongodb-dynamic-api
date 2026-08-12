import { Model } from 'mongoose';
import { AfterSaveCallback, CallbackRetryOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetOneService } from './get-one-service.interface';

export abstract class BaseGetOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetOneService<Entity> {
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getOne(id: string, user?: unknown): Promise<Entity> {
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

      await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

      return this.buildInstance(document);
    } catch (error) {
      this.handleMongoErrors(error);
    }
  }
}
