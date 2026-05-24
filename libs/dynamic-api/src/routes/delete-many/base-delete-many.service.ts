import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  DeleteResult,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  BeforeDeleteManyCallback,
  AfterSaveCallback,
  CascadeConfig,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DeleteManyService } from './delete-many-service.interface';

export abstract class BaseDeleteManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DeleteManyService<Entity>
{
  protected readonly beforeSaveCallback: BeforeSaveDeleteManyCallback<
    Entity,
    BeforeSaveDeleteManyContext
  > | undefined;
  protected readonly beforeDeleteCallback: BeforeDeleteManyCallback<
    Entity,
    BeforeSaveDeleteManyContext
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly cascade: CascadeConfig[] | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteMany(ids: string[], user?: unknown): Promise<DeletePresenter> {
    // Fetch documents ahead of hooks when at least one hook is registered
    let documents: Entity[] = [];

    if (this.beforeDeleteCallback ?? this.beforeSaveCallback) {
      documents = await this.model
        .find({
          _id: { $in: ids },
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity[]>()

        .exec();
    }

    // ── beforeDeleteCallback ─────────────────────────────────────────────────
    // Runs OUTSIDE try-catch: HTTP exceptions propagate cleanly to the client.
    if (this.beforeDeleteCallback) {
      await this.beforeDeleteCallback(
        documents,
        { ids },
        this.callbackMethods,
        user,
      );
    }

    // ── beforeSaveCallback (fix: also outside try-catch) ────────────────────
    if (this.beforeSaveCallback) {
      await this.beforeSaveCallback(
        documents,
        { ids },
        this.callbackMethods,
        user,
      );
    }

    let deletedCount = 0;
    try {
      // Fetch documents for after-save callback when not yet loaded
      if (!documents.length && this.callback) {
        documents = await this.model
          .find({
            _id: { $in: ids },
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          })
          .lean<Entity[]>()
          .exec();
      }

      let op: DeleteResult;

      if (this.isSoftDeletable) {
        const deleted = await this.model
          .updateMany(
            { _id: { $in: ids }, isDeleted: false },
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
            (document) => this.callback(this.addDocumentId(document), this.callbackMethods, user),
          ),
        );
      }

      deletedCount = op.deletedCount;
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }

    // ── Cascade — runs OUTSIDE the try-catch so delete result is never zeroed ──
    if (this.cascade?.length && deletedCount > 0) {
      await this.executeCascade(ids, this.cascade, this.isSoftDeletable);
    }

    return plainToInstance(DeletePresenter, { deletedCount });
  }
}
