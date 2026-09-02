import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
  DynamicAPISchemaOptions,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E tests for predicateBehavior: 'filter' on GetMany routes.
 *
 * Scenarios:
 *   1. All documents pass predicate → returns full list (200)
 *   2. Some documents fail predicate → returns filtered list (200, never 403)
 *   3. No documents pass predicate → returns [] (200, never 403)
 */
describe('DynamicApiModule forFeature - predicateBehavior filter (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @DynamicAPISchemaOptions({})
  @Schema({ collection: 'filter-entities' })
  class FilterEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Boolean, required: true })
    visible: boolean;
  }

  const setupApp = async (fixtures: (connection: Connection) => Promise<void>) => {
    await initApp(
      {
        entity: FilterEntity,
        controllerOptions: {
          path: 'filter-entities',
        },
        routes: [
          {
            type: 'GetMany',
            isPublic: true,
            abilityPredicate: (entity: FilterEntity) => entity.visible === true,
            predicateBehavior: 'filter',
          },
        ],
      },
      {},
      fixtures,
    );
  };

  describe('GET /filter-entities — predicateBehavior: filter', () => {

    it('should return all documents when all pass the predicate', async () => {
      await setupApp(async (_: Connection) => {
        const model = await getModelFromEntity(FilterEntity);
        await model.insertMany([
          { name: 'visible1', visible: true },
          { name: 'visible2', visible: true },
        ]);
      });

      const { body, status } = await server.get('/filter-entities');

      expect(status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body.every((e: FilterEntity) => e.visible === true)).toBe(true);
    });

    it('should return only allowed documents when some fail the predicate (no 403)', async () => {
      await setupApp(async (_: Connection) => {
        const model = await getModelFromEntity(FilterEntity);
        await model.insertMany([
          { name: 'visible', visible: true },
          { name: 'hidden', visible: false },
        ]);
      });

      const { body, status } = await server.get('/filter-entities');

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('visible');
      expect(body[0].visible).toBe(true);
    });

    it('should return empty array when no documents pass the predicate (no 403)', async () => {
      await setupApp(async (_: Connection) => {
        const model = await getModelFromEntity(FilterEntity);
        await model.insertMany([
          { name: 'hidden1', visible: false },
          { name: 'hidden2', visible: false },
        ]);
      });

      const { body, status } = await server.get('/filter-entities');

      expect(status).toBe(200);
      expect(body).toEqual([]);
    });

    it('should return 200 with empty array even without auth token when predicateBehavior is filter', async () => {
      await setupApp(async (_: Connection) => {
        const model = await getModelFromEntity(FilterEntity);
        await model.insertMany([{ name: 'hidden', visible: false }]);
      });

      // No auth token — guard bypasses, service silently filters
      const { status } = await server.get('/filter-entities');

      expect(status).toBe(200);
    });
  });
});

