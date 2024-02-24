import { BaseEntity } from '@dynamic-api';
import { GetManyService } from '@dynamic-api/modules';
import { BaseService } from '@dynamic-api/services';
import { Model } from 'mongoose';

export abstract class BaseGetManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetManyService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getMany(query?: object): Promise<Entity[]> {
    const documents = await this.model
      .find({
        ...(query ?? {}),
        ...(this.isSoftDeletable ? { isDeleted: false } : {}),
      })
      .lean()
      .exec();

    return documents.map((d) => this.buildInstance(d as Entity));
  }
}
