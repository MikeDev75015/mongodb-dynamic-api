import { Model } from 'mongoose';
import { AbilityPredicate, AfterSaveCallback, CallbackRetryOptions, PredicateBehavior } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { GetManyService } from './get-many-service.interface';

export abstract class BaseGetManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetManyService<Entity> {
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;
  protected readonly predicateBehavior: PredicateBehavior | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getMany(query?: object, user?: unknown): Promise<Entity[]> {
    const documents = await this.model
    .find({
      ...(
        this.isSoftDeletable ? { isDeleted: false } : {}
      ),
      ...(
        query ?? {}
      ),
    })
    .lean<Entity[]>()
    .exec();

    if (documents.length) {
      await Promise.all(
        documents.map(
          (document) => this.invokeAfterSaveCallback(
            this.callback, this.addDocumentId(document), user, this.callbackRetry,
          ),
        ),
      );
    }

    const instances = documents.map((d) => this.buildInstance(d));

    if (this.predicateBehavior === 'filter' && this.abilityPredicate) {
      return instances.filter((instance) => this.abilityPredicate(instance, user));
    }

    return instances;
  }
}
