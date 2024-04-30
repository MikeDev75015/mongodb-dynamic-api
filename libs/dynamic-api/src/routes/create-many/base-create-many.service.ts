import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { CreateManyService } from './create-many-service.interface';

export abstract class BaseCreateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements CreateManyService<Entity>
{
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async createMany(partials: Partial<Entity>[]): Promise<Entity[]> {
    try {
      const created = await this.model.create(partials);
      const documents = await this.model
      .find({ _id: { $in: created.map(({ _id }) => _id.toString()) } })
      .lean()
      .exec();

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(document as Entity, this.model),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d as Entity));
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
    }
  }
}
