import { cloneDeep } from '../../helpers/lodash.helper';
import { Model } from 'mongoose';
import {
  BeforeSaveListCallback,
  BeforeSaveUpdateManyContext,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services/base/base.service';
import { UpdateManyService } from './update-many-service.interface';

export abstract class BaseUpdateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements UpdateManyService<Entity> {
  protected readonly beforeSaveCallback: BeforeSaveListCallback<
    Entity,
    BeforeSaveUpdateManyContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly auditLog: boolean | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async updateMany(ids: string[], partial: Partial<Entity>, user?: unknown): Promise<Entity[]> {
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
          user,
        );

        const updatesWithDerived = updates.map((u, index) =>
          this.applyDerivedFields(u, 'save', this.addDocumentId(toUpdateList[index]) as Partial<Entity>),
        );

        await Promise.all(
          updatesWithDerived.map((update, index) =>
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
        const partialWithDerived = this.applyDerivedFields(partial, 'save');

        await this.model
        .updateMany(
          {
            _id: { $in: ids },
            ...(
              this.isSoftDeletable ? { isDeleted: false } : undefined
            ),
          },
          partialWithDerived,
        )
        .lean()
        .exec();
      }

      const documents = await this.model.find({ _id: { $in: ids } }).lean<Entity[]>().exec();

      if (documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.invokeAfterSaveCallback(
              this.callback, this.addDocumentId(document), user, this.callbackRetry,
            ),
          ),
        );

        if (this.auditLog) {
          const beforeById = new Map(toUpdateList.map((doc) => [
            (doc._id as { toString(): string }).toString(), doc as Record<string, unknown>,
          ]));

          await Promise.all(
            documents.map((document) => {
              const documentId = (document._id as { toString(): string }).toString();

              return this.writeAuditLog(
                'update',
                documentId,
                beforeById.get(documentId) ?? null,
                document as Record<string, unknown>,
                user,
              );
            }),
          );
        }
      }

      return documents.map((d) => this.buildInstance(d));
    } catch (error: unknown) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
