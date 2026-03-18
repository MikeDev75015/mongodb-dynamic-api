import { cloneDeep } from 'lodash';
import { Model } from 'mongoose';
import {
  BeforeSaveCallback,
  BeforeSaveUpdateManyContext,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { UpdateManyService } from './update-many-service.interface';

export abstract class BaseUpdateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateManyService<Entity> {
  protected readonly beforeSaveCallback: BeforeSaveCallback<
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

      const update = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          undefined,
          { ids, update: cloneDeep(partial) },
          this.callbackMethods,
        )
        : partial;

      await this.model
      .updateMany(
        {
          _id: { $in: ids },
          ...(
            this.isSoftDeletable ? { isDeleted: false } : undefined
          ),
        },
        update,
      )
      .lean()
      .exec();

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
