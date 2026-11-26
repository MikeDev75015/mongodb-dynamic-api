import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication, Type } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty, DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for `CustomRouteConfig.isArrayResponse` — a custom route that returns a list
 * (typically one replacing a native `GetMany` at `path: ''`) used to be documented in OpenAPI as
 * a single object, and its presenter was only ever called through `fromEntity(wholeList)`.
 */
describe('DynamicApiModule forFeature - custom route isArrayResponse (e2e)', () => {
  @Schema({ collection: 'array_response_lobbies' })
  class ArrayLobbyEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: [Number], default: [] })
    strokes: number[];
  }

  class ArrayLobbyPresenter {
    @ApiProperty()
    name: string;

    @ApiProperty()
    strokeCount: number;

    static fromEntities(lobbies: ArrayLobbyEntity[]): ArrayLobbyPresenter[] {
      return lobbies.map(({ name, strokes }) => ({ name, strokeCount: strokes.length }));
    }
  }

  class SingleLobbyPresenter {
    @ApiProperty()
    label: string;

    static fromEntity(lobby: ArrayLobbyEntity): SingleLobbyPresenter {
      return { label: `lobby:${lobby.name}` };
    }
  }

  const findAll: CustomRouteConfig<ArrayLobbyEntity>['handler'] = ({ model }) =>
    model.find().sort({ name: 1 }).lean().exec();

  const listRoute: CustomRouteConfig<ArrayLobbyEntity> = {
    path: '',
    method: 'GET',
    isArrayResponse: true,
    dTOs: { presenter: ArrayLobbyPresenter as unknown as Type<ArrayLobbyPresenter> },
    handler: findAll,
  };

  const labelsRoute: CustomRouteConfig<ArrayLobbyEntity> = {
    path: 'labels',
    method: 'GET',
    isArrayResponse: true,
    dTOs: { presenter: SingleLobbyPresenter as unknown as Type<SingleLobbyPresenter> },
    handler: findAll,
  };

  const firstRoute: CustomRouteConfig<ArrayLobbyEntity> = {
    path: 'first',
    method: 'GET',
    dTOs: { presenter: SingleLobbyPresenter as unknown as Type<SingleLobbyPresenter> },
    handler: ({ model }) => model.findOne().sort({ name: 1 }).lean().exec(),
  };

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    await initApp(
      {
        entity: ArrayLobbyEntity,
        // The custom route at path '' takes the place of the native GetMany.
        controllerOptions: { path: 'array-lobbies', isPublic: true, routesConfig: { excluded: ['GetMany'] } },
        customRoutes: [listRoute, labelsRoute, firstRoute],
      },
      {},
      async () => {
        const model = await getModelFromEntity(ArrayLobbyEntity);
        await model.insertMany([
          { name: 'a', strokes: [1, 2, 3] },
          { name: 'b', strokes: [] },
        ]);
      },
    );
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  const getResponseSchema = (path: string) => {
    const document: OpenAPIObject = SwaggerModule.createDocument(
      global.app as INestApplication,
      new DocumentBuilder().build(),
    );
    const responses = document.paths[path]?.get?.responses ?? {};
    const [response] = Object.values(responses) as { content?: Record<string, { schema?: object }> }[];

    return response?.content?.['application/json']?.schema;
  };

  it('maps the list through presenter.fromEntities on a custom route replacing GetMany', async () => {
    const { status, body } = await server.get('/array-lobbies');

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      { name: 'a', strokeCount: 3 },
      { name: 'b', strokeCount: 0 },
    ]);
  });

  it('falls back to presenter.fromEntity on every item when fromEntities is missing', async () => {
    const { status, body } = await server.get('/array-lobbies/labels');

    expect(status).toBe(200);
    expect(body).toStrictEqual([{ label: 'lobby:a' }, { label: 'lobby:b' }]);
  });

  it('documents the response as an array of the presenter in OpenAPI', () => {
    expect(getResponseSchema('/array-lobbies')).toStrictEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/ArrayLobbyPresenter' },
    });
  });

  it('keeps a single-object response without isArrayResponse', async () => {
    const { status, body } = await server.get('/array-lobbies/first');

    expect(status).toBe(200);
    expect(body).toStrictEqual({ label: 'lobby:a' });
    expect(getResponseSchema('/array-lobbies/first')).toStrictEqual({
      $ref: '#/components/schemas/SingleLobbyPresenter',
    });
  });
});
