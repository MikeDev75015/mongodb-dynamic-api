import { Prop, Schema } from '@nestjs/mongoose';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, PagingQuery, parsePagingParams } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for suggestion #12's second half — a reusable `page`/`pageSize` query DTO
 * (`PagingQuery`) and clamp helper (`parsePagingParams`), so a `.Paging()`-based `Aggregate`
 * route's query DTO doesn't have to redeclare and reimplement that clamping from scratch. Paired
 * with a `dTOs.presenter.fromAggregate`, the route correctly returns `{ list, count, totalPage }`.
 */
describe('DynamicApiModule forFeature - PagingQuery + parsePagingParams (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'paging_query_helper_products' })
  class PagingQueryHelperProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  class ProductStatsQuery extends PagingQuery {
    static toPipeline(query: ProductStatsQuery): PipelineStage[] {
      const { page, pageSize } = parsePagingParams(query, { defaultPageSize: 2, maxPageSize: 10 });

      return new PipelineBuilder('paging-query-helper-products')
      .Sort({ name: 1 })
      .Paging(pageSize, page)
      .build();
    }
  }

  class ProductStatsPresenter {
    static fromAggregate(list: PagingQueryHelperProductEntity[], count: number, totalPage: number) {
      return { list, count, totalPage };
    }
  }

  beforeEach(async () => {
    await initApp({
      entity: PagingQueryHelperProductEntity,
      controllerOptions: { path: 'paging-query-helper-products', isPublic: true },
      routes: [
        {
          type: 'Aggregate',
          subPath: 'aggregate',
          dTOs: { query: ProductStatsQuery, presenter: ProductStatsPresenter },
        },
      ],
    });
  });

  it('uses the default pageSize (2) and page (1) when the query omits both', async () => {
    const model = await getModelFromEntity(PagingQueryHelperProductEntity);
    await model.insertMany([{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }]);

    const { status, body } = await server.get('/paging-query-helper-products/aggregate', { query: {} });

    expect(status).toBe(200);
    expect(body.list).toHaveLength(2); // defaultPageSize: 2
    expect(body.list.map((p: PagingQueryHelperProductEntity) => p.name)).toEqual(['apple', 'banana']);
    expect(body.count).toBe(3);
    expect(body.totalPage).toBe(2); // 3 elements / 2 per page
  });

  it('honors an explicit page/pageSize from the query string', async () => {
    const model = await getModelFromEntity(PagingQueryHelperProductEntity);
    await model.insertMany([{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }]);

    const { status, body } = await server.get(
      '/paging-query-helper-products/aggregate',
      { query: { page: '2', pageSize: '2' } },
    );

    expect(status).toBe(200);
    expect(body.list).toHaveLength(1); // page 2 of size 2 — only "cherry" left
    expect(body.list[0].name).toBe('cherry');
    expect(body.count).toBe(3);
    expect(body.totalPage).toBe(2);
  });

  it('clamps an out-of-range pageSize to the configured maxPageSize instead of erroring', async () => {
    const model = await getModelFromEntity(PagingQueryHelperProductEntity);
    await model.insertMany([{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }]);

    const { status, body } = await server.get(
      '/paging-query-helper-products/aggregate',
      { query: { pageSize: '9999' } },
    );

    expect(status).toBe(200);
    expect(body.list).toHaveLength(3); // clamped to maxPageSize: 10, still only 3 documents exist
    expect(body.totalPage).toBe(1);
  });
});
