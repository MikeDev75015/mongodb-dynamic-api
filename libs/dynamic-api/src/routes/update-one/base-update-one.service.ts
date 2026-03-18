import { cloneDeep } from 'lodash';
import { Model } from 'mongoose';
import { BeforeSaveCallback, BeforeSaveUpdateContext, AfterSaveCallback } from '../../interfaces';
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

  protected constructor(
    protected readonly model: Model<Entity>,
  ) {
    super(model);
  }

  async updateOne(id: string, partial: Partial<Entity>): Promise<Entity> {
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

      const update = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          this.addDocumentId(document),
          { id, update: cloneDeep(partial) },
          this.callbackMethods,
        )
        : partial;

      const updatedDocument = await this.model
      .findOneAndUpdate(
        { _id: id },
        { $set: update },
        { new: true },
      )
      .lean<Entity>()
      .exec();

      if (this.callback) {
        await this.callback(this.addDocumentId(updatedDocument), this.callbackMethods);
      }

      return this.buildInstance(updatedDocument);
    } catch (error) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
