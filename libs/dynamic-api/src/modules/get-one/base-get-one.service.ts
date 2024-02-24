import { BaseEntity } from '@dynamic-api';
import { GetOneService } from '@dynamic-api/modules';
import { BaseService } from '@dynamic-api/services';
import { Model } from 'mongoose';

export abstract class BaseGetOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getOne(id: string): Promise<Entity> {
    const document = await this.model
      .findOne({
        _id: id,
        ...(this.isSoftDeletable ? { isDeleted: false } : undefined),
      })
      .lean()
      .exec();

    if (!document) {
      this.handleDocumentNotFound();
    }

    return this.buildInstance(document as Entity);
  }
}
