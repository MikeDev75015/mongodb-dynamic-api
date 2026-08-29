import { PipelineStage } from 'mongodb-pipeline-builder';
import { MongoDBDynamicApiLogger } from '../logger';
import { warnIfPagingResultDropped } from './paging-presenter-warning.helper';

describe('warnIfPagingResultDropped', () => {
  let warnSpy: jest.SpyInstance;

  const pagingPipeline = [
    { $facet: { docs: [{ $limit: 10 }], count: [{ $count: 'totalElements' }] } },
  ] as unknown as PipelineStage[];

  const plainPipeline = [{ $match: { name: 'test' } }] as PipelineStage[];

  beforeEach(() => {
    warnSpy = jest.spyOn(MongoDBDynamicApiLogger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when the pipeline uses .Paging() and there is no fromAggregate', () => {
    warnIfPagingResultDropped(pagingPipeline, false, 'Product');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"Product"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fromAggregate'));
  });

  it('does not warn when fromAggregate is present, even with a paging pipeline', () => {
    warnIfPagingResultDropped(pagingPipeline, true, 'Product');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when the pipeline is not a paging pipeline, even without fromAggregate', () => {
    warnIfPagingResultDropped(plainPipeline, false, 'Product');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when neither condition holds', () => {
    warnIfPagingResultDropped(plainPipeline, true, 'Product');

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
