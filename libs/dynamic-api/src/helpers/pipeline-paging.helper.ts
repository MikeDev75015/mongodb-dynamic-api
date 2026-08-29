import { PipelineStage } from 'mongodb-pipeline-builder';

/** Shape of the `$facet` stage `mongodb-pipeline-builder`'s `.Paging()` appends as pipeline[0]. */
interface PagingFacetStage {
  $facet?: {
    docs?: unknown[];
    count?: unknown[];
  };
}

/**
 * True when `pipeline` was built with `.Paging()` — its first stage is a `$facet` with both a
 * `docs` and a `count` sub-pipeline, the shape `GetPagingResult` expects and produces
 * `{ GetDocs(), GetCount(), GetTotalPageNumber() }` from.
 *
 * Shared between {@link BaseAggregateService.aggregate} (the real response path, already
 * paging-aware) and {@link BaseService.aggregateDocuments} (used by the ability-predicate guard
 * and by `CallbackMethods.aggregateDocuments`) — both need to detect this shape before deciding
 * whether to unwrap the `$facet` result via `GetPagingResult` or run a plain aggregate. Without
 * this check, a paging pipeline's single `{ docs, count }` facet result gets treated as if it
 * were a plain document — `addDocumentId` then does `document._id.toString()` on an object that
 * has no `_id` at all, throwing `Cannot read properties of undefined (reading 'toString')`.
 */
function isPagingPipeline(pipeline: PipelineStage[]): boolean {
  const firstStageFacet = (pipeline[0] as PagingFacetStage)?.$facet;

  if (!firstStageFacet) {
    return false;
  }

  const hasValidDocs = Array.isArray(firstStageFacet.docs) && firstStageFacet.docs.length > 0;
  const hasValidCount = Array.isArray(firstStageFacet.count) && firstStageFacet.count.length > 0;

  return hasValidDocs && hasValidCount;
}

export { isPagingPipeline };
