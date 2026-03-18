import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  DeleteResult,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeleteOneService } from './delete-one-service.interface';

export abstract class BaseDeleteOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteOneService<Entity>
{
  protected readonly beforeSaveCallback: BeforeSaveDeleteCallback<
    Entity,
    BeforeSaveDeleteContext
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteOne(id: string): Promise<DeletePresenter> {
    try {
      const document = await this.model
        .findOne({
          _id: id,
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity>()
        .exec();

      if (this.beforeSaveCallback) {
        await this.beforeSaveCallback(
          document ? this.addDocumentId(document) : undefined,
          { id },
          this.callbackMethods,
        );
      }

      let op: DeleteResult;

      if (this.isSoftDeletable) {
        const deleted = await this.model
        .updateOne(
          {
            _id: id,
            isDeleted: false,
          },
          { $set: { isDeleted: true, deletedAt: Date.now() } },
        )
        .exec();

        op = { deletedCount: deleted.modifiedCount };
      } else {
        op = await this.model.deleteOne({ _id: id }).exec();
      }

      if (this.callback && document) {
        await this.callback(this.addDocumentId(document), this.callbackMethods);
      }

      return plainToInstance(DeletePresenter, { deletedCount: op.deletedCount });
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }
  }
}
