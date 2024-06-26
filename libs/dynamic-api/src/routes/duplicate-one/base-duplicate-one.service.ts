import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { baseEntityKeysToExclude } from '../../mixins';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DuplicateOneService } from './duplicate-one-service.interface';

export abstract class BaseDuplicateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DuplicateOneService<Entity>
{
  protected readonly entity: Type<Entity>;
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

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
        .lean()
        .exec();

      if (!toDuplicate) {
        this.handleDocumentNotFound();
      }

      const { _id } = await this.model.create(plainToInstance(this.entity, {
        ...Object.entries(toDuplicate).reduce((acc, [key, value]) => {
          if ((baseEntityKeysToExclude() as string[]).includes(key)) {
            return acc;
          }

          return { ...acc, [key]: value };
        }, {}),
        ...partial,
      }));
      const document = await this.model.findOne({ _id }).lean().exec();

      if (this.callback) {
        await this.callback(document as Entity, this.callbackMethods);
      }

      return this.buildInstance(document as Entity);
    } catch (error: any) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
