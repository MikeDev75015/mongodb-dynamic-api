import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Reusable `page`/`pageSize` query fields for an `Aggregate` route built with `.Paging()`.
 * Extend this in your own query DTO instead of redeclaring the two fields (and reimplementing
 * their clamping) in every `*.query.ts` — pair with {@link parsePagingParams} inside `toPipeline`.
 *
 * @example
 * ```typescript
 * import { PagingQuery, parsePagingParams } from 'mongodb-dynamic-api';
 * import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';
 *
 * class ProductStatsQuery extends PagingQuery {
 *   static toPipeline(query: ProductStatsQuery): PipelineStage[] {
 *     const { page, pageSize } = parsePagingParams(query);
 *     return new PipelineBuilder('product-stats')
 *       .Sort({ createdAt: -1 })
 *       .Paging(pageSize, page)
 *       .build();
 *   }
 * }
 * ```
 */
export class PagingQuery {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: '1-based page number.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, description: 'Documents per page.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
