import { Type } from '@nestjs/common';
import { GetResult, PipelineStage } from 'mongodb-pipeline-builder';
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

  async aggregate(pipeline: PipelineStage[]): Promise<Entity[]> {
    try {
      const result = await GetResult<Entity>(this.model, pipeline);
      const documents = result.GetDocs();

      if (this.callback && documents.length) {
        await Promise.all(
          documents.map(
            (document) => this.callback(document, this.callbackMethods),
          ),
        );
      }

      return documents.map((d) => this.buildInstance(d));
    } catch (error: any) {
      this.handleMongoErrors(error, false);
      this.handleDuplicateKeyError(error);
    }
  }
}
