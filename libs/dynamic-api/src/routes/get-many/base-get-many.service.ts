import { Model, PopulateOptions } from 'mongoose';
import {
  AbilityPredicate,
  AfterSaveCallback,
  CallbackRetryOptions,
  PopulateConfig,
  PredicateBehavior,
} from '../../interfaces';
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
  protected readonly populate: PopulateConfig | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getMany(query?: object, user?: unknown): Promise<Entity[]> {
    const findQuery = this.model.find({
      ...(
        this.isSoftDeletable ? { isDeleted: false } : {}
      ),
      ...(
        query ?? {}
      ),
    });

    if (this.populate) {
      // See BaseGetOneService.getOne for why this cast is needed.
      findQuery.populate(this.populate as PopulateOptions | (string | PopulateOptions)[]);
    }

    const documents = await findQuery
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
