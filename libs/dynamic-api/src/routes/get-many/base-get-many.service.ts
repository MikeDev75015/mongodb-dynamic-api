import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetManyService } from './get-many-service.interface';

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
        ...(this.isSoftDeletable ? { isDeleted: false } : {}),
        ...(query ?? {}),
      })
      .lean()
      .exec();

    return documents.map((d) => this.buildInstance(d as Entity));
  }
}
