import { PipelineStage } from 'mongodb-pipeline-builder';
import { BaseEntity } from '../../models';

type AggregateServiceResponse<Entity extends BaseEntity> = {
  list: Entity[];
  count: number;
  totalPage: number;
};

interface AggregateService<Entity extends BaseEntity> {
  aggregate(pipeline: PipelineStage[]): Promise<AggregateServiceResponse<Entity>>;
}

export type { AggregateService, AggregateServiceResponse };
