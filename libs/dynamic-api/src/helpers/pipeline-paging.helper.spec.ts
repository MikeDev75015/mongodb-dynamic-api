import { describe, expect, it, test } from 'vitest';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { isPagingPipeline } from './pipeline-paging.helper';

describe('isPagingPipeline', () => {
  it('should return false for an empty pipeline', () => {
    expect(isPagingPipeline([])).toBe(false);
  });

  it('should return false for a plain pipeline with no $facet stage', () => {
    const pipeline = [{ $match: { name: 'test' } }] as PipelineStage[];

    expect(isPagingPipeline(pipeline)).toBe(false);
  });

  it('should return false for a $facet stage missing docs', () => {
    const pipeline = [{ $facet: { count: [{ $count: 'totalElements' }] } }] as unknown as PipelineStage[];

    expect(isPagingPipeline(pipeline)).toBe(false);
  });

  it('should return false for a $facet stage missing count', () => {
    const pipeline = [{ $facet: { docs: [{ $limit: 10 }] } }] as unknown as PipelineStage[];

    expect(isPagingPipeline(pipeline)).toBe(false);
  });

  it('should return false for a $facet stage with empty docs/count arrays', () => {
    const pipeline = [{ $facet: { docs: [], count: [] } }] as unknown as PipelineStage[];

    expect(isPagingPipeline(pipeline)).toBe(false);
  });

  it('should return true for a .Paging()-shaped $facet stage (docs + count sub-pipelines)', () => {
    const pipeline = [
      { $facet: { docs: [{ $limit: 10 }], count: [{ $count: 'totalElements' }] } },
    ] as unknown as PipelineStage[];

    expect(isPagingPipeline(pipeline)).toBe(true);
  });
});
