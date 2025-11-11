import { Type } from '@nestjs/common';
import { GetPagingResult, GetResult, PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';
import { AggregateService } from './aggregate-service.interface';

export abstract class BaseAggregateService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements AggregateService<Entity>
{
  protected readonly entity: Type<Entity>;
  protected readonly callback: DynamicApiServiceCallback<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async aggregate(pipeline: PipelineStage[]): Promise<{ list: Entity[]; count: number; totalPage: number; }> {
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

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(this.addDocumentId(document), this.callbackMethods),
          ),
        );
      }

      return { list: documents.map((d) => this.buildInstance(d)), count, totalPage };
    } catch (error: any) {
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
