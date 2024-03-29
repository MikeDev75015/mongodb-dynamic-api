import { Model } from 'mongoose';
import { baseEntityKeysToExclude } from '../../mixins';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { DuplicateManyService } from './duplicate-many-service.interface';

export abstract class BaseDuplicateManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements DuplicateManyService<Entity> {
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
      .lean()
      .exec();

      if (!toDuplicateList?.length) {
        this.handleDocumentNotFound();
      }

      const duplicatedList = await this.model.create(toDuplicateList.map((d) => (
        {
          ...Object.entries(d).reduce((acc, [key, value]) => {
            if ((
              baseEntityKeysToExclude() as string[]
            ).includes(key)) {
              return acc;
            }

            return { ...acc, [key]: value };
          }, {}),
          ...partial,
        }
      )));
      const documents = await this.model.find({ _id: { $in: duplicatedList.map(({ _id }) => _id.toString()) } })
      .lean()
      .exec();
      return documents.map((d) => this.buildInstance(d as Entity));
    } catch (error: any) {
      this.handleDuplicateKeyError(error);
      throw error;
    }
  }
}
