import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetOneService } from './get-one-service.interface';

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
