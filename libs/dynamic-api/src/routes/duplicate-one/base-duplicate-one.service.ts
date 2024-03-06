import { Model } from 'mongoose';
import { baseEntityKeysToExclude } from '../../mixins';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DuplicateOneService } from './duplicate-one-service.interface';

export abstract class BaseDuplicateOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DuplicateOneService<Entity>
{
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

      const { _id } = await this.model.create({
        ...Object.entries(toDuplicate).reduce((acc, [key, value]) => {
          if ((baseEntityKeysToExclude() as string[]).includes(key)) {
            return acc;
          }

          return { ...acc, [key]: value };
        }, {}),
        ...partial,
      });
      const document = await this.model.findOne({ _id }).lean().exec();

      return this.buildInstance(document as Entity);
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
      throw error;
    }
  }
}
