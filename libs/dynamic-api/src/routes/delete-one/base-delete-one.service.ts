import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  DeleteResult,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  BeforeDeleteCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
  CascadeConfig,
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
  protected readonly beforeDeleteCallback: BeforeDeleteCallback<
    Entity,
    BeforeSaveDeleteContext
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly cascade: CascadeConfig[] | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteOne(id: string, user?: unknown): Promise<DeletePresenter> {
    // Fetch document ahead of hooks when at least one hook is registered
    let document: Entity | null = null;

    if (this.beforeDeleteCallback ?? this.beforeSaveCallback) {
      document = await this.model
        .findOne({
          _id: id,
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity>()
        .exec();
    }

    // ── beforeDeleteCallback + beforeSaveCallback ────────────────────────────
    // Runs OUTSIDE try-catch: HTTP exceptions propagate cleanly to the client.
    await this.invokePreHooks(id, document, user);

    let deletedCount = 0;
    try {
      // Fetch document for after-save callback when not yet loaded
      if (!document && this.callback) {
        document = await this.model
          .findOne({
            _id: id,
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          })
          .lean<Entity>()
          .exec();
      }

      let op: DeleteResult;

      if (this.isSoftDeletable) {
        const deleted = await this.model
          .updateOne(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: Date.now() } },
          )
          .exec();

        op = { deletedCount: deleted.modifiedCount };
      } else {
        op = await this.model.deleteOne({ _id: id }).exec();
      }

      if (document) {
        await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);
      }

      deletedCount = op.deletedCount;
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }

    // ── Cascade — runs OUTSIDE the try-catch so delete result is never zeroed ──
    if (this.cascade?.length && deletedCount > 0) {
      await this.executeCascade([id], this.cascade, this.isSoftDeletable);
    }

    return plainToInstance(DeletePresenter, { deletedCount });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Invokes beforeDeleteCallback then beforeSaveCallback when defined.
   * Extracted to reduce the cognitive complexity of {@link deleteOne}.
   */
  private async invokePreHooks(id: string, document: Entity | null, user: unknown): Promise<void> {
    const entity = document ? this.addDocumentId(document) : undefined;

    if (this.beforeDeleteCallback) {
      await this.beforeDeleteCallback(entity, { id }, this.callbackMethods, user);
    }

    if (this.beforeSaveCallback) {
      await this.beforeSaveCallback(entity, { id }, this.callbackMethods, user);
    }
  }
}
