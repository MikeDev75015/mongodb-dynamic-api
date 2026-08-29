/** Options for {@link parsePagingParams}. */
interface ParsePagingParamsOptions {
  /** Used when `query.pageSize` is missing. @default 20 */
  defaultPageSize?: number;
  /** Upper bound `pageSize` is clamped to, regardless of what the caller requested. @default 100 */
  maxPageSize?: number;
}

/** Clamped, safe-to-use `page`/`pageSize` pair returned by {@link parsePagingParams}. */
interface ParsedPagingParams {
  page: number;
  pageSize: number;
}

/**
 * Clamps `page`/`pageSize` from a query object (typically one extending `PagingQuery`) into
 * values safe to pass straight to `PipelineBuilder(...).Paging(pageSize, page)` — `page` is
 * always `>= 1`, `pageSize` is always between `1` and `maxPageSize` inclusive, and a missing/
 * non-finite value falls back to its default rather than propagating `NaN`/`0`/a negative number
 * into the pipeline.
 *
 * @example
 * ```typescript
 * class ProductStatsQuery extends PagingQuery {
 *   static toPipeline(query: ProductStatsQuery): PipelineStage[] {
 *     const { page, pageSize } = parsePagingParams(query, { defaultPageSize: 25, maxPageSize: 50 });
 *     return new PipelineBuilder('product-stats').Paging(pageSize, page).build();
 *   }
 * }
 * ```
 */
function parsePagingParams(
  query: { page?: number; pageSize?: number },
  options: ParsePagingParamsOptions = {},
): ParsedPagingParams {
  const { defaultPageSize = 20, maxPageSize = 100 } = options;

  const page = clamp(query.page, 1, 1, Number.POSITIVE_INFINITY);
  const pageSize = clamp(query.pageSize, defaultPageSize, 1, maxPageSize);

  return { page, pageSize };
}

/** `value` clamped to `[min, max]`, falling back to `fallback` when `value` isn't a finite number. */
function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  const truncated = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
  return Math.min(max, Math.max(min, truncated));
}

export { parsePagingParams, ParsePagingParamsOptions, ParsedPagingParams };
