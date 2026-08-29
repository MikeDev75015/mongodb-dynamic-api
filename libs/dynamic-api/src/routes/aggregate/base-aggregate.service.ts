import { Type } from '@nestjs/common';
import { GetPagingResult, GetResult, PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { isPagingPipeline } from '../../helpers/pipeline-paging.helper';
import { AbilityPredicate, AfterSaveCallback, CallbackRetryOptions, PredicateBehavior } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { AggregateService } from './aggregate-service.interface';

export abstract class BaseAggregateService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements AggregateService<Entity>
{
  protected readonly entity: Type<Entity>;
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;
  protected readonly predicateBehavior: PredicateBehavior | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async aggregate(pipeline: PipelineStage[], user?: unknown): Promise<{ list: Entity[]; count: number; totalPage: number; }> {
    try {
      let documents: Entity[];
      let count: number;
      let totalPage: number;

      if (isPagingPipeline(pipeline)) {
        const pagingResult = await GetPagingResult<Entity>(this.model, pipeline);
        documents = pagingResult.GetDocs();
        count = pagingResult.GetCount();
        totalPage = pagingResult.GetTotalPageNumber();
      } else {
        const result = await GetResult<Entity>(this.model, pipeline);
        documents = result.GetDocs();
        count = result.GetCount();
        totalPage = 1;
      }

      if (documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.invokeAfterSaveCallback(
              this.callback, this.addDocumentId(document), user, this.callbackRetry,
            ),
          ),
        );
      }

      const list = documents.map((d) => this.buildInstance(d));

      if (this.predicateBehavior === 'filter' && this.abilityPredicate) {
        // count/totalPage deliberately stay as computed from the full aggregate result, not
        // list.length post-filter — they describe the underlying query result (how many
        // documents match, how many pages that makes), while `list` is the caller's personally
        // visible subset of the current page. Recomputing count from the filtered page (as this
        // used to do) desynced it from totalPage, which is still based on the full total: a
        // page could read e.g. "count: 2, totalPage: 5" when the real 5-page total had nothing
        // to do with 2. Leaving both untouched keeps them mutually consistent.
        const filtered = list.filter((instance) => this.abilityPredicate(instance, user));
        return { list: filtered, count, totalPage };
      }

      return { list, count, totalPage };
    } catch (error: unknown) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
