import { FilterQuery, Model, PopulateOptions } from 'mongoose';
import { assertNoMongoOperators } from '../../helpers/request-filter.helper';
import { resolveRouteProjection } from '../../helpers/route-projection.helper';
import {
  AbilityPredicate,
  AfterSaveCallback,
  CallbackRetryOptions,
  PopulateConfig,
  PredicateBehavior,
  QueryScope,
  RouteProjection,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services/base/base.service';
import { GetManyService } from './get-many-service.interface';

export abstract class BaseGetManyService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetManyService<Entity> {
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;
  protected readonly predicateBehavior: PredicateBehavior | undefined;
  protected readonly populate: PopulateConfig | undefined;
  protected readonly queryScope: QueryScope<Entity> | undefined;
  protected readonly projection: RouteProjection<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getMany(query?: object, user?: unknown): Promise<Entity[]> {
    // `query` is the client's HTTP query string or WebSocket payload, used as a MongoDB filter.
    assertNoMongoOperators(query);

    // `queryScope` is the server-side, caller-derived restriction: resolved before any read, so
    // the documents outside it are never fetched. Nullish = "nothing visible" → no query at all
    // (fail-closed: a scope function that forgets to return is treated like `null`, not `{}`).
    const scope = this.queryScope ? await this.queryScope(user) : undefined;
    if (this.queryScope && (scope === null || scope === undefined)) {
      return [];
    }

    const findQuery = this.model.find({
      ...(
        this.isSoftDeletable ? { isDeleted: false } : {}
      ),
      ...(
        query ?? {}
      ),
      // `$and` rather than a spread: a client filter on the same field must narrow the scope,
      // never replace it (and `assertNoMongoOperators` already bars the client from `$and`).
      ...(
        scope ? { $and: [scope] } : {}
      ),
    } as FilterQuery<Entity>);

    const projection = resolveRouteProjection(this.projection, user);
    if (projection !== undefined) {
      findQuery.select(projection);
    }

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
