import { PipelineStage } from 'mongodb-pipeline-builder';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';
import { isPagingPipeline } from './pipeline-paging.helper';

const logger = new MongoDBDynamicApiLogger('AggregateRoute');

/**
 * Warns (via `MONGODB_DYNAMIC_API_LOGGER`, silent unless that's set) when an `Aggregate` route's
 * pipeline is built with `.Paging()` but the response presenter has no static `fromAggregate`.
 *
 * `BaseAggregateService.aggregate()` always computes `{ list, count, totalPage }`, but the
 * controller/gateway only forwards that whole shape when the presenter implements
 * `fromAggregate(list, count, totalPage)` — without it, `count`/`totalPage` are silently dropped
 * and only the raw `list` array reaches the client. Nothing errors, so a pager wired against this
 * route silently has no page/total to show — this is checked on every call (not just once at
 * boot) since whether a given request's pipeline actually used `.Paging()` can depend on that
 * request's own query params, not just the route's static config.
 *
 * @internal Not part of the public API.
 */
function warnIfPagingResultDropped(
  pipeline: PipelineStage[],
  hasFromAggregate: boolean,
  entityName: string,
): void {
  if (hasFromAggregate || !isPagingPipeline(pipeline)) {
    return;
  }

  logger.warn(
    `[Aggregate] "${entityName}": pipeline uses .Paging(), but the route's presenter has no `
    + 'static fromAggregate(list, count, totalPage) method — count/totalPage are computed then '
    + 'silently dropped from the response; only the raw list array is returned. Add fromAggregate '
    + 'to the presenter (dTOs.presenter) to receive { list, count, totalPage } instead.',
  );
}

export { warnIfPagingResultDropped };
