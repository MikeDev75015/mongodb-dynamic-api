import { plainToInstance } from 'class-transformer';
import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import {
  BeforeSaveCallback,
  BeforeSaveCreateContext,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { CreateOneService } from './create-one-service.interface';

export abstract class BaseCreateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements CreateOneService<Entity>
{
  protected readonly beforeSaveCallback: BeforeSaveCallback<
    Entity,
    BeforeSaveCreateContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly auditLog: boolean | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async createOne(partial: Partial<Entity>, user?: unknown): Promise<Entity> {
    try {
      const afterCallback = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          undefined,
          { toCreate: cloneDeep(partial) },
          this.callbackMethods,
          user,
        )
        : cloneDeep(partial);

      const toCreate = this.applyDerivedFields(afterCallback, 'save');

      const { _id } = await this.model.create(plainToInstance(this.entity, toCreate));

      const document = await this.model.findOne({ _id }).lean<Entity>().exec();

      await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

      if (this.auditLog) {
        await this.writeAuditLog(
          'create', (_id as { toString(): string }).toString(), null, document as Record<string, unknown>, user,
        );
      }

      return this.buildInstance(document);
    } catch (error) {
      this.handleDuplicateKeyError(error);
    }
  }
}
