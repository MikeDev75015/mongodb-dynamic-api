import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import {
  BeforeSaveCallback,
  BeforeSaveDuplicateContext,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { baseEntityKeysToExclude } from '../../mixins';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DuplicateOneService } from './duplicate-one-service.interface';

export abstract class BaseDuplicateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DuplicateOneService<Entity>
{
  protected readonly entity: Type<Entity>;
  protected readonly beforeSaveCallback: BeforeSaveCallback<
    Entity,
    BeforeSaveDuplicateContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly auditLog: boolean | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async duplicateOne(id: string, partial: Partial<Entity> | undefined, user?: unknown): Promise<Entity> {
    try {
      const toDuplicate = await this.model
        .findOne({
          _id: id,
          ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
        })
        .lean<Entity>()
        .exec();

      if (!toDuplicate) {
        this.handleDocumentNotFound();
      }

      const baseData = {
        ...Object.entries(toDuplicate).reduce((acc, [key, value]) => {
          if ((baseEntityKeysToExclude() as string[]).includes(key)) {
            return acc;
          }

          return { ...acc, [key]: value };
        }, {}),
        ...partial,
      };

      const afterCallback = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          this.addDocumentId(toDuplicate),
          { id, override: partial ? cloneDeep(partial) : undefined },
          this.callbackMethods,
          user,
        )
        : baseData;

      const toCreate = this.applyDerivedFields(afterCallback, 'save');

      const { _id } = await this.model.create(plainToInstance(this.entity, toCreate));
      const document = await this.model.findOne({ _id }).lean<Entity>().exec();

      await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

      if (this.auditLog) {
        await this.writeAuditLog(
          'duplicate', _id.toString(), null, document as Record<string, unknown>, user,
        );
      }

      return this.buildInstance(document);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(JSON.stringify(error));
      this.handleMongoErrors(err, false);
      this.handleDuplicateKeyError(err);
    }
  }
}
