import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { Model } from 'mongoose';
import {
  BeforeSaveCreateManyContext,
  BeforeSaveListCallback,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { CreateManyService } from './create-many-service.interface';

export abstract class BaseCreateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements CreateManyService<Entity> {
  protected readonly entity: Type<Entity>;

  protected readonly beforeSaveCallback: BeforeSaveListCallback<
    Entity,
    BeforeSaveCreateManyContext<Entity>
  > | undefined;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async createMany(partials: Partial<Entity>[]): Promise<Entity[]> {
    try {
      const toCreate = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          undefined,
          { toCreate: cloneDeep(partials) },
          this.callbackMethods,
        )
        : partials;

      const created = await this.model.create(
        toCreate.map((p) => plainToInstance(this.entity, p)),
      );
      const documents = await this.model
      .find({ _id: { $in: created.map(({ _id }) => _id.toString()) } })
      .lean()
      .exec();

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(this.addDocumentId(document as Entity), this.callbackMethods),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d as Entity));
    } catch (error: unknown) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
