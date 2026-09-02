import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { PipelineBuilder, PipelineStage } from 'mongodb-pipeline-builder';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for suggestion #14 — an `Aggregate` route whose presenter implements
 * `fromAggregate` returns `{ list, count, totalPage }` at runtime (suggestion #12), but the
 * generated Swagger/OpenAPI document never reflected that: `RouteDecoratorsBuilder` always
 * documented a bare `Presenter`/`Presenter[]` response, so every OpenAPI client generated against
 * such a route (e.g. `ng-openapi-gen`) got the wrong return type.
 *
 * Fixed by building a Swagger-only `Paginated<Presenter>` wrapper schema
 * (`{ list: Presenter[], count: number, totalPage: number }`) whenever the route's presenter has
 * `fromAggregate`, and documenting that instead. This test builds the actual OpenAPI document (the
 * same call a real app makes to serve `/api-json`/`/api`) and inspects it, rather than just
 * reflect-metadata in isolation.
 */
describe('DynamicApiModule forFeature - Aggregate paginated response in OpenAPI (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'openapi_paginated_products' })
  class OpenApiPaginatedProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  class ProductPagedPresenter {
    static fromAggregate(list: OpenApiPaginatedProductEntity[], count: number, totalPage: number) {
      return { list, count, totalPage };
    }
  }

  class ProductAggregateQuery {
    static toPipeline(): PipelineStage[] {
      return new PipelineBuilder('openapi-paginated-products')
      .Sort({ name: 1 })
      .Paging(10, 1)
      .build();
    }
  }

  it('documents { list, count, totalPage } instead of a bare presenter when fromAggregate exists', async () => {
    await initApp({
      entity: OpenApiPaginatedProductEntity,
      controllerOptions: { path: 'openapi-paginated-products', isPublic: true },
      routes: [
        {
          type: 'Aggregate',
          subPath: 'aggregate',
          dTOs: { query: ProductAggregateQuery, presenter: ProductPagedPresenter },
        },
      ],
    });

    const document: OpenAPIObject = SwaggerModule.createDocument(
      global.app as INestApplication,
      new DocumentBuilder().build(),
    );

    const operation = document.paths['/openapi-paginated-products/aggregate']?.get;
    expect(operation).toBeDefined();

    // No explicit `status` is set on the route's `ApiResponse`, so `@nestjs/swagger` groups it
    // under the `default` response key rather than `200`.
    const responseSchema = (operation?.responses?.default as any)?.content?.['application/json']?.schema;
    expect(responseSchema).toBeDefined();
    expect('$ref' in (responseSchema as object)).toBe(true);

    const schemaName = ((responseSchema as { $ref: string }).$ref).split('/').pop() as string;
    expect(schemaName).toMatch(/^Paginated/);

    const wrapperSchema = document.components?.schemas?.[schemaName] as any;
    expect(wrapperSchema).toBeDefined();
    expect(wrapperSchema.properties.list.type).toBe('array');
    expect(wrapperSchema.properties.list.items).toHaveProperty('$ref');
    expect(wrapperSchema.properties.count.type).toBe('number');
    expect(wrapperSchema.properties.totalPage.type).toBe('number');

    // The underlying presenter is still a real, referenced schema (registered via
    // `ApiExtraModels`) — not inlined away.
    const itemSchemaName = (wrapperSchema.properties.list.items.$ref as string).split('/').pop();
    expect(document.components?.schemas?.[itemSchemaName as string]).toBeDefined();
  });

  it('keeps documenting a bare presenter for an Aggregate route with no fromAggregate', async () => {
    await initApp({
      entity: OpenApiPaginatedProductEntity,
      controllerOptions: { path: 'openapi-plain-products', isPublic: true },
      routes: [
        {
          type: 'Aggregate',
          subPath: 'aggregate',
          // No dTOs.presenter — falls back to EntityPresenterMixin, which has no fromAggregate.
          dTOs: { query: ProductAggregateQuery },
        },
      ],
    });

    const document: OpenAPIObject = SwaggerModule.createDocument(
      global.app as INestApplication,
      new DocumentBuilder().build(),
    );

    const operation = document.paths['/openapi-plain-products/aggregate']?.get;
    const responseSchema = (operation?.responses?.default as any)?.content?.['application/json']?.schema;

    expect(responseSchema).toBeDefined();
    // Bare presenter, not a Paginated<...> wrapper — unchanged pre-fix behavior for routes that
    // don't have fromAggregate.
    const schemaName = ((responseSchema.$ref as string) ?? '').split('/').pop() ?? '';
    expect(schemaName).not.toMatch(/^Paginated/);
  });
});
