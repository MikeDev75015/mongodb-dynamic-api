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
 * E2E coverage for suggestion #12 — an `Aggregate` route built with `.Paging()` only returns
 * `{ list, count, totalPage }` when its presenter implements `fromAggregate`; without one (the
 * default `EntityPresenterMixin`, or any "normal" custom presenter that doesn't happen to add
 * `fromAggregate`), `count`/`totalPage` are silently dropped — the client only ever sees a raw
 * array, with no error or indication anything is missing.
 *
 * This is now caught by a request-time warning (`warnIfPagingResultDropped`, unit-tested in
 * `helpers/paging-presenter-warning.helper.spec.ts`) — but the response *shape* is deliberately
 * left unchanged, since defaulting every paginated Aggregate route to `{list,count,totalPage}`
 * would be a breaking change for existing consumers relying on the plain-array shape today. This
 * spec locks in that the array-only behavior is still exactly what it was — the fix is a warning,
 * not a silent shape change of its own.
 */
describe('DynamicApiModule forFeature - Aggregate .Paging() without fromAggregate (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'paging_no_presenter_products' })
  class PagingNoPresenterProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  class ProductPagingQuery {
    static toPipeline(): PipelineStage[] {
      return new PipelineBuilder('paging-no-presenter-products')
      .Sort({ name: 1 })
      .Paging(2, 1)
      .build();
    }
  }

  beforeEach(async () => {
    await initApp({
      entity: PagingNoPresenterProductEntity,
      controllerOptions: { path: 'paging-no-presenter-products', isPublic: true },
      routes: [
        {
          type: 'Aggregate',
          subPath: 'aggregate',
          // No dTOs.presenter — falls back to EntityPresenterMixin, which has no fromAggregate.
          dTOs: { query: ProductPagingQuery },
        },
      ],
    });
  });

  it('returns a plain array — count/totalPage are silently absent, unchanged from before the fix', async () => {
    const model = await getModelFromEntity(PagingNoPresenterProductEntity);
    await model.insertMany([{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }]);

    const { status, body } = await server.get('/paging-no-presenter-products/aggregate', { query: {} });

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2); // Paging(2, 1) — page size 2
    // No wrapper object — count/totalPage were computed by the service but never reached the
    // response. This is the exact silent-drop behavior suggestion #12 reports; still true by
    // design (see file-level doc comment) — only a warning was added, not a shape change.
    expect(body.count).toBeUndefined();
    expect(body.totalPage).toBeUndefined();
  });
});
