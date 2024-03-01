import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { CreateOneService } from './create-one-service.interface';

export abstract class BaseCreateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements CreateOneService<Entity>
{
  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async createOne(partial: Partial<Entity>): Promise<Entity> {
    try {
      const { _id } = await this.model.create(partial);
      const document = await this.model.findOne({ _id }).lean().exec();
      return this.buildInstance(document as Entity);
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
      throw error;
    }
  }
}
