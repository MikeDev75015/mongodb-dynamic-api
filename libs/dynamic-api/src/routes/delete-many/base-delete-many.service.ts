import { plainToInstance } from 'class-transformer';
import { ClientSession, Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  BeforeDeleteManyCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
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
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly cascade: CascadeConfig[] | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteMany(ids: string[], user?: unknown): Promise<DeletePresenter> {
    // Fetch documents ahead of hooks when at least one hook is registered
    let documents: Entity[] = [];

    // ── Pre-hooks (OUTSIDE try-catch: HTTP exceptions propagate cleanly) ─────
    if (this.beforeDeleteCallback ?? this.beforeSaveCallback) {
      documents = await this.model
        .find({
          _id: { $in: ids },
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity[]>()
        .exec();

      await this.beforeDeleteCallback?.(documents, { ids }, this.callbackMethods, user);
      await this.beforeSaveCallback?.(documents, { ids }, this.callbackMethods, user);
    }

    let deletedCount = 0;
    let cascadeCompleted = true;
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

      if (this.cascade?.length) {
        const result = await this.deleteWithCascade(
          (session) => this.deleteParentDocuments(ids, session),
          ids,
          this.isSoftDeletable,
          this.cascade,
        );
        deletedCount = result.deletedCount;
        cascadeCompleted = result.cascadeCompleted;
      } else {
        deletedCount = await this.deleteParentDocuments(ids);
      }

      if (documents?.length) {
        await Promise.all(
          documents.map(
            (document) => this.invokeAfterSaveCallback(
              this.callback, this.addDocumentId(document), user, this.callbackRetry,
            ),
          ),
        );
      }
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }

    // ── Fallback cascade — runs OUTSIDE the try-catch so a successful parent delete's result is
    // never zeroed by a cascade failure. Only reached when the connection didn't support a
    // transaction (deleteWithCascade already ran the cascade atomically otherwise). ──
    if (!cascadeCompleted && this.cascade?.length && deletedCount > 0) {
      await this.executeCascade(ids, this.cascade, this.isSoftDeletable);
    }

    return plainToInstance(DeletePresenter, { deletedCount });
  }

  /**
   * Deletes (or soft-deletes) the parent documents, preserving the exact pre-transaction call
   * signature when `session` is omitted — required so the plain (no-cascade / fallback) path
   * behaves byte-for-byte like before this method existed.
   */
  private async deleteParentDocuments(ids: string[], session?: ClientSession): Promise<number> {
    if (this.isSoftDeletable) {
      const deleted = await (
        session
          ? this.model.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: Date.now() } },
            { session },
          )
          : this.model.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: Date.now() } },
          )
      ).exec();

      return deleted.modifiedCount;
    }

    const deleted = await (
      session
        ? this.model.deleteMany({ _id: { $in: ids } }, { session })
        : this.model.deleteMany({ _id: { $in: ids } })
    ).exec();

    return deleted.deletedCount;
  }
}
