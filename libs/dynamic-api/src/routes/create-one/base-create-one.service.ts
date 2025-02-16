import { plainToInstance } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { Model } from 'mongoose';
import {
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceBeforeSaveCreateContext,
  DynamicApiServiceCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { CreateOneService } from './create-one-service.interface';

export abstract class BaseCreateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements CreateOneService<Entity>
{
  protected readonly beforeSaveCallback: DynamicApiServiceBeforeSaveCallback<
    Entity,
    DynamicApiServiceBeforeSaveCreateContext<Entity>
  > | undefined;
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async createOne(partial: Partial<Entity>): Promise<Entity> {
    try {
      const toCreate = this.beforeSaveCallback
        ? await this.beforeSaveCallback(
          undefined,
          { toCreate: cloneDeep(partial) },
          this.callbackMethods,
        )
        : partial;

      const { _id } = await this.model.create(plainToInstance(this.entity, toCreate));

      const document = await this.model.findOne({ _id }).lean().exec() as Entity;

      if (this.callback) {
        await this.callback(document, this.callbackMethods);
      }

      return this.buildInstance(document);
    } catch (error) {
      this.handleDuplicateKeyError(error);
    }
  }
}
