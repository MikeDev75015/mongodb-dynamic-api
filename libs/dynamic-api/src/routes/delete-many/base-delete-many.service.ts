import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  DeleteResult,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteManyContext,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeleteManyService } from './delete-many-service.interface';

export abstract class BaseDeleteManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteManyService<Entity>
{
  protected readonly beforeSaveCallback: BeforeSaveDeleteCallback<
    Entity,
    BeforeSaveDeleteManyContext
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteMany(ids: string[]): Promise<DeletePresenter> {
    try {
      const documents = await this.model
        .find({
          _id: { $in: ids },
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity[]>()
        .exec();

      if (this.beforeSaveCallback) {
        await this.beforeSaveCallback(
          undefined,
          { ids },
          this.callbackMethods,
        );
      }

      let op: DeleteResult;

      if (this.isSoftDeletable) {
        const deleted = await this.model
        .updateMany(
          {
            _id: { $in: ids },
            isDeleted: false,
          },
          { $set: { isDeleted: true, deletedAt: Date.now() } },
        )
        .exec();

        op = { deletedCount: deleted.modifiedCount };
      } else {
        op = await this.model.deleteMany({ _id: { $in: ids } }).exec();
      }

      if (this.callback && documents?.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(this.addDocumentId(document), this.callbackMethods),
          ),
        );
      }

      return plainToInstance(DeletePresenter, { deletedCount: op.deletedCount });
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }
  }
}
