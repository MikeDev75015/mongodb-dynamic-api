import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { baseEntityKeysToExclude } from '../../mixins';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DuplicateManyService } from './duplicate-many-service.interface';

export abstract class BaseDuplicateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DuplicateManyService<Entity> {
  protected readonly entity: Type<Entity>;

  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async duplicateMany(ids: string[], partial: Partial<Entity> | undefined): Promise<Entity[]> {
    try {
      const toDuplicateList = await this.model
      .find({
        _id: { $in: ids },
        ...(
          this.isSoftDeletable ? { isDeleted: false } : undefined
        ),
      })
      .lean<Entity[]>()
      .exec();

      if (!toDuplicateList?.length) {
        this.handleDocumentNotFound();
      }

      const duplicatedList = await this.model.create(toDuplicateList.map((d) => plainToInstance(
        this.entity,
        {
          ...Object.entries(d).reduce((acc, [key, value]) => {
            if ((
              baseEntityKeysToExclude() as string[]
            ).includes(key)) {
              return acc;
            }

            return { ...acc, [key]: value };
          }, {}),
          ...partial ?? {},
        },
      )));
      const documents = await this.model.find({ _id: { $in: duplicatedList.map(({ _id }) => _id.toString()) } })
      .lean<Entity[]>()
      .exec();

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(this.addDocumentId(document), this.callbackMethods),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleMongoErrors(err, false);
      this.handleDuplicateKeyError(err);
    }
  }
}
