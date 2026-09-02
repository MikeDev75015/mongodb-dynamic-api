import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for suggestion #9 — `abilityPredicate` was incompatible with an `Aggregate`
 * pipeline built with `.Paging()` (a `$facet` producing `{ docs, count }`), two distinct bugs:
 *
 *  - `predicateBehavior` default ('throw'/reject): the ability-predicate Guard re-runs the
 *    pipeline itself via `aggregateDocumentsWithAbilityPredicate` → `aggregateDocuments`, which
 *    called `addDocumentId` directly on the raw aggregate result. On a paging pipeline that
 *    result is the `{ docs, count }` facet summary, not an entity — it has no `_id` — so
 *    `addDocumentId` threw `Cannot read properties of undefined (reading 'toString')`,
 *    surfacing as a 500 on every request, allowed or denied.
 *  - `predicateBehavior: 'filter'`: no crash, but `BaseAggregateService.aggregate()` recomputed
 *    `count` as `filtered.length` (the page's post-filter size) while leaving `totalPage`
 *    computed from the real, unfiltered total — an internally inconsistent pair (e.g.
 *    "count: 1, totalPage: 2" for a single visible item out of a real 2-page result).
 *
 * Both are fixed: `aggregateDocuments` now detects a paging pipeline (`isPagingPipeline`) and
 * unwraps it via `GetPagingResult` before calling `addDocumentId`; `aggregate()`'s filter branch
 * no longer recomputes `count` — `count`/`totalPage` always describe the real underlying result,
 * only `list` narrows to what the caller is allowed to see.
 */
describe('DynamicApiModule forFeature - Aggregate abilityPredicate + Paging (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'paging_predicate_products' })
  class PagingPredicateProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Boolean, default: false })
    restricted: boolean;
  }

  @Schema({ collection: 'paging_predicate_users' })
  class PagingPredicateUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  const notRestricted = (product: PagingPredicateProductEntity) => !product.restricted;

  class ProductPagedPresenter {
    static fromAggregate(list: PagingPredicateProductEntity[], count: number, totalPage: number) {
      return { list, count, totalPage };
    }
  }

  const registerAndLogin = async (email: string) => {
    await server.post('/auth/register', { email, password: 'password123' });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });

    return { accessToken };
  };

  describe('default predicateBehavior (throw/reject) — the crash this fix addresses', () => {
    class ProductAggregateQuery {
      static toPipeline(): PipelineStage[] {
        return new PipelineBuilder('paging-predicate-products-throw')
        .Sort({ name: 1 })
        .Paging(2, 1)
        .build();
      }
    }

    beforeEach(async () => {
      await initApp(
        {
          entity: PagingPredicateProductEntity,
          controllerOptions: { path: 'paging-predicate-products-throw' },
          routes: [
            {
              type: 'Aggregate',
              subPath: 'aggregate',
              dTOs: { query: ProductAggregateQuery, presenter: ProductPagedPresenter },
              abilityPredicate: notRestricted,
            },
          ],
        },
        {
          useAuth: {
            userEntity: PagingPredicateUserEntity,
            login: { loginField: 'email', passwordField: 'password' },
          },
        },
      );
    });

    it('never returns 500 and allows the request when every document on the page passes', async () => {
      const model = await getModelFromEntity(PagingPredicateProductEntity);
      await model.insertMany([
        { name: 'apple', restricted: false },
        { name: 'banana', restricted: false },
      ]);
      const { accessToken } = await registerAndLogin('shopper1@paging.co');

      const { status, body } = await server.get(
        '/paging-predicate-products-throw/aggregate',
        { authToken: accessToken, query: {} },
      );

      expect(status).toBe(200);
      expect(body.list).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('never returns 500 and denies the request (403) when a document on the page fails', async () => {
      const model = await getModelFromEntity(PagingPredicateProductEntity);
      await model.insertMany([
        { name: 'apple', restricted: false },
        { name: 'cherry', restricted: true },
      ]);
      const { accessToken } = await registerAndLogin('shopper2@paging.co');

      const { status } = await server.get(
        '/paging-predicate-products-throw/aggregate',
        { authToken: accessToken, query: {} },
      );

      // The pre-fix behavior was a 500 (addDocumentId crash) regardless of this outcome — 403
      // here proves both "no crash" and "the predicate is actually evaluated against real docs".
      expect(status).toBe(403);
    });
  });

  describe("predicateBehavior: 'filter' — count/totalPage consistency this fix addresses", () => {
    class ProductAggregateFilterQuery {
      static toPipeline(): PipelineStage[] {
        return new PipelineBuilder('paging-predicate-products-filter')
        .Sort({ name: 1 })
        .Paging(4, 1)
        .build();
      }
    }

    beforeEach(async () => {
      await initApp(
        {
          entity: PagingPredicateProductEntity,
          controllerOptions: { path: 'paging-predicate-products-filter' },
          routes: [
            {
              type: 'Aggregate',
              subPath: 'aggregate',
              isPublic: true,
              dTOs: { query: ProductAggregateFilterQuery, presenter: ProductPagedPresenter },
              abilityPredicate: notRestricted,
              predicateBehavior: 'filter',
            },
          ],
        },
      );
    });

    it('keeps count/totalPage describing the real total, not the filtered page size', async () => {
      const model = await getModelFromEntity(PagingPredicateProductEntity);
      await model.insertMany([
        { name: 'apple', restricted: false },
        { name: 'banana', restricted: true },
        { name: 'cherry', restricted: false },
        { name: 'date', restricted: true },
      ]);

      const { status, body } = await server.get('/paging-predicate-products-filter/aggregate', { query: {} });

      expect(status).toBe(200);
      // Only the 2 non-restricted products are visible in the list...
      expect(body.list).toHaveLength(2);
      expect(body.list.every((p: PagingPredicateProductEntity) => !p.restricted)).toBe(true);
      // ...but count/totalPage still describe the real, unfiltered result (4 elements, 1 page of
      // 4) — never recomputed from list.length, which would have desynced them.
      expect(body.count).toBe(4);
      expect(body.totalPage).toBe(1);
    });
  });
});
