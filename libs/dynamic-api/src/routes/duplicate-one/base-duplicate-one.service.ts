import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { cloneDeep } from '../../helpers';
import { Model } from 'mongoose';
import {
  BeforeSaveCallback,
  BeforeSaveDuplicateContext,
  AfterSaveCallback,
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

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async duplicateOne(id: string, partial: Partial<Entity> | undefined): Promise<Entity> {
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

      const toCreate = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          this.addDocumentId(toDuplicate),
          { id, override: partial ? cloneDeep(partial) : undefined },
          this.callbackMethods,
        )
        : baseData;

      const { _id } = await this.model.create(plainToInstance(this.entity, toCreate));
      const document = await this.model.findOne({ _id }).lean<Entity>().exec();

      if (this.callback) {
        await this.callback(this.addDocumentId(document), this.callbackMethods);
      }

      return this.buildInstance(document);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(JSON.stringify(error));
      this.handleMongoErrors(err, false);
      this.handleDuplicateKeyError(err);
    }
  }
}
