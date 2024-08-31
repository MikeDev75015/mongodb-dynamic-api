import { PipelineStage } from 'mongodb-pipeline-builder';
import { BaseEntity } from '../../models';

interface AggregateService<Entity extends BaseEntity> {
  aggregate(pipeline: PipelineStage[]): Promise<Entity[]>;
}

export type { AggregateService };
