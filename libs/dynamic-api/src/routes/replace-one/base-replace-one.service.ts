import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import {
  BeforeSaveCallback,
  BeforeSaveReplaceContext,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { ReplaceOneService } from './replace-one-service.interface';

export abstract class BaseReplaceOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements ReplaceOneService<Entity> {
  protected readonly entity: Type<Entity>;

  protected readonly beforeSaveCallback: BeforeSaveCallback<
    Entity,
    BeforeSaveReplaceContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async replaceOne(id: string, partial: Partial<Entity>, user?: unknown): Promise<Entity> {
    try {
      const existingDocument = await this.model
      .findOne({
        _id: id,
        ...(
          this.isSoftDeletable ? { isDeleted: false } : undefined
        ),
      })
      .lean<Entity>()
      .exec();

      if (!existingDocument) {
        this.handleDocumentNotFound();
      }

      const afterCallback = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          this.addDocumentId(existingDocument),
          { id, replacement: cloneDeep(partial) },
          this.callbackMethods,
          user,
        )
        : cloneDeep(partial);

      const replacement = this.applyDerivedFields(afterCallback, 'save');

      const document = await this.model
      .findOneAndReplace(
        { _id: id },
        plainToInstance(this.entity, replacement),
        {
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean<Entity>()
      .exec();

      if (!document) {
        this.handleDocumentNotFound();
      }

      await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

      return this.buildInstance(document);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(JSON.stringify(error));
      this.handleMongoErrors(err, false);
      this.handleDuplicateKeyError(err);
    }
  }
}
