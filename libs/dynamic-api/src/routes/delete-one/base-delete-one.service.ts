import { plainToInstance } from 'class-transformer';
import { ClientSession, Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
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
  protected readonly auditLog: boolean | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async deleteOne(id: string, user?: unknown): Promise<DeletePresenter> {
    // Fetch document ahead of hooks when at least one hook is registered
    let document: Entity | null = null;

    if (this.beforeDeleteCallback ?? this.beforeSaveCallback ?? this.auditLog) {
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
    let cascadeCompleted = true;
    try {
      // Fetch document for after-save callback when not yet loaded
      if (!document && (this.callback ?? this.auditLog)) {
        document = await this.model
          .findOne({
            _id: id,
            ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
          })
          .lean<Entity>()
          .exec();
      }

      if (this.cascade?.length) {
        const result = await this.deleteWithCascade(
          (session) => this.deleteParentDocument(id, session),
          [id],
          this.isSoftDeletable,
          this.cascade,
        );
        deletedCount = result.deletedCount;
        cascadeCompleted = result.cascadeCompleted;
      } else {
        deletedCount = await this.deleteParentDocument(id);
      }

      if (document) {
        await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

        if (this.auditLog) {
          await this.writeAuditLog('delete', id, document as Record<string, unknown>, null, user);
        }
      }
    } catch (error: unknown) {
      return plainToInstance(DeletePresenter, { deletedCount: 0 });
    }

    // ── Fallback cascade — runs OUTSIDE the try-catch so a successful parent delete's result is
    // never zeroed by a cascade failure. Only reached when the connection didn't support a
    // transaction (deleteWithCascade already ran the cascade atomically otherwise). ──
    if (!cascadeCompleted && this.cascade?.length && deletedCount > 0) {
      await this.executeCascade([id], this.cascade, this.isSoftDeletable);
    }

    return plainToInstance(DeletePresenter, { deletedCount });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Deletes (or soft-deletes) the parent document, preserving the exact pre-transaction call
   * signature when `session` is omitted — required so the plain (no-cascade / fallback) path
   * behaves byte-for-byte like before this method existed.
   */
  private async deleteParentDocument(id: string, session?: ClientSession): Promise<number> {
    if (this.isSoftDeletable) {
      const deleted = await (
        session
          ? this.model.updateOne(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: Date.now() } },
            { session },
          )
          : this.model.updateOne(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: Date.now() } },
          )
      ).exec();

      return deleted.modifiedCount;
    }

    const deleted = await (
      session
        ? this.model.deleteOne({ _id: id }, { session })
        : this.model.deleteOne({ _id: id })
    ).exec();

    return deleted.deletedCount;
  }

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
