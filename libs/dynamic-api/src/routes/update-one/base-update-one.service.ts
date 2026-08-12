import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import { BeforeSaveCallback, BeforeSaveUpdateContext, AfterSaveCallback, CallbackRetryOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateOneService } from './update-one-service.interface';

export abstract class BaseUpdateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateOneService<Entity> {
  protected readonly beforeSaveCallback: BeforeSaveCallback<
    Entity,
    BeforeSaveUpdateContext<Entity>
  > | undefined;

  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;

  protected constructor(
    protected readonly model: Model<Entity>,
  ) {
    super(model);
  }

  async updateOne(id: string, partial: Partial<Entity>, user?: unknown): Promise<Entity> {
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

      const afterCallback = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          this.addDocumentId(document),
          { id, update: cloneDeep(partial) },
          this.callbackMethods,
          user,
        )
        : cloneDeep(partial);

      const update = this.applyDerivedFields(afterCallback, 'save', this.addDocumentId(document) as Partial<Entity>);

      const updatedDocument = await this.model
      .findOneAndUpdate(
        { _id: id },
        { $set: update },
        { new: true },
      )
      .lean<Entity>()
      .exec();

      await this.invokeAfterSaveCallback(
        this.callback, this.addDocumentId(updatedDocument), user, this.callbackRetry,
      );

      return this.buildInstance(updatedDocument);
    } catch (error) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
