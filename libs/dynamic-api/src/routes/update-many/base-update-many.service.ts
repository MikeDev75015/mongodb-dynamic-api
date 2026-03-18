import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import {
  BeforeSaveListCallback,
  BeforeSaveUpdateManyContext,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

export abstract class BaseUpdateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateManyService<Entity> {
  protected readonly beforeSaveCallback: BeforeSaveListCallback<
    Entity,
    BeforeSaveUpdateManyContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async updateMany(ids: string[], partial: Partial<Entity>): Promise<Entity[]> {
    try {
      const toUpdateList = await this.model.find({ _id: { $in: ids } }).lean<Entity[]>().exec();
      if (toUpdateList?.length !== ids.length) {
        this.handleDocumentNotFound();
      }

      if (this.beforeSaveCallback) {
        const updates = await this.beforeSaveCallback(
          toUpdateList,
          { ids, update: cloneDeep(partial) },
          this.callbackMethods,
        );

        await Promise.all(
          updates.map((update, index) =>
            this.model
            .findByIdAndUpdate(
              toUpdateList[index]._id,
              update,
              { new: true },
            )
            .lean()
            .exec(),
          ),
        );
      } else {
        await this.model
        .updateMany(
          {
            _id: { $in: ids },
            ...(
              this.isSoftDeletable ? { isDeleted: false } : undefined
            ),
          },
          partial,
        )
        .lean()
        .exec();
      }

      const documents = await this.model.find({ _id: { $in: ids } }).lean<Entity[]>().exec();

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(this.addDocumentId(document), this.callbackMethods),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d));
    } catch (error: unknown) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
