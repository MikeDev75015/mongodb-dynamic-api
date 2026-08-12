import { Type } from '@nestjs/common';
import { GetPagingResult, GetResult, PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
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

      if (this.withPagination(pipeline)) {
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
        const filtered = list.filter((instance) => this.abilityPredicate(instance, user));
        return { list: filtered, count: filtered.length, totalPage };
      }

      return { list, count, totalPage };
    } catch (error: unknown) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }

  private withPagination(pipeline: PipelineStage[]): boolean {
    const firstStageFacet = pipeline[0].$facet;
    if (!firstStageFacet) {
      return false;
    }

    const hasValidDocs = Array.isArray(firstStageFacet.docs) && firstStageFacet.docs.length > 0;
    const hasValidCount = Array.isArray(firstStageFacet.count) && firstStageFacet.count.length > 0;

    return hasValidDocs && hasValidCount;
  }
}
