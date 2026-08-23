import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiModule } from '../../src';
import { closeTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for audit finding F9 — a custom route's path params had no way to be declared for
 * Swagger/OpenAPI, so the generated document's `parameters` for that operation were empty and
 * codegen tools (e.g. `ng-openapi-gen`) produced a client function that never substituted the
 * param placeholder(s) in the URL. `dTOs.params` fixes this by emitting one `@ApiParam` entry per
 * declared property.
 *
 * This test builds the actual OpenAPI document (the same call a real app makes to serve
 * `/api-json`/`/api`) and inspects it, rather than just reflect-metadata in isolation — proving
 * the fix produces a document a real codegen tool would actually consume correctly.
 */
describe('DynamicApiModule forFeature - custom route dTOs.params in OpenAPI (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'openapi_families' })
  class OpenApiFamilyEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  class InviteMemberParams {
    familyId = '';
  }

  const inviteMemberRoute: CustomRouteConfig<OpenApiFamilyEntity> = {
    path: ':familyId/invite-member',
    method: 'POST',
    dTOs: { params: InviteMemberParams },
    handler: async () => ({ sent: true }),
  };

  it('should declare the custom route\'s path param in the generated OpenAPI document', async () => {
    await initApp({
      entity: OpenApiFamilyEntity,
      controllerOptions: { path: 'openapi-families', isPublic: true },
      customRoutes: [inviteMemberRoute],
    });

    const document: OpenAPIObject = SwaggerModule.createDocument(
      global.app as INestApplication,
      new DocumentBuilder().build(),
    );

    const operation = document.paths['/openapi-families/{familyId}/invite-member']?.post;
    expect(operation).toBeDefined();

    const pathParams = (operation?.parameters ?? []).filter((p) => 'in' in p && p.in === 'path');
    expect(pathParams).toEqual([
      expect.objectContaining({ name: 'familyId', in: 'path' }),
    ]);
  });

  it('should not declare any path param when dTOs.params is omitted', async () => {
    const noParamsRoute: CustomRouteConfig<OpenApiFamilyEntity> = {
      path: 'stats',
      method: 'GET',
      handler: async () => ({ count: 0 }),
    };

    await initApp({
      entity: OpenApiFamilyEntity,
      controllerOptions: { path: 'openapi-families', isPublic: true },
      customRoutes: [noParamsRoute],
    });

    const document: OpenAPIObject = SwaggerModule.createDocument(
      global.app as INestApplication,
      new DocumentBuilder().build(),
    );

    const operation = document.paths['/openapi-families/stats']?.get;
    const pathParams = (operation?.parameters ?? []).filter((p) => 'in' in p && p.in === 'path');
    expect(pathParams).toEqual([]);
  });
});
