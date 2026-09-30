import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, enableDynamicAPIValidation } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E — `?ids=a` (a single id, what a generated OpenAPI client sends for a one-element array)
 * reaches the `*Many` routes as the string `'a'`. It must be handled like `?ids=a&ids=b`.
 */
describe('Many routes — a single id in the ids query (e2e)', () => {
  @Schema({ collection: 'many_single_id_games' })
  class SingleIdGameEntity extends BaseEntity {
    @IsOptional()
    @IsString()
    @Prop({ type: String, required: true })
    name: string;
  }

  const setup = async (withAppValidation: boolean) => {
    await initApp(
      {
        entity: SingleIdGameEntity,
        controllerOptions: { path: 'single-id-games', isPublic: true },
        routes: [{ type: 'DeleteMany' }, { type: 'UpdateMany' }, { type: 'DuplicateMany' }],
      },
      undefined,
      undefined,
      withAppValidation
        ? async (app: INestApplication) => { enableDynamicAPIValidation(app); }
        : undefined,
    );

    const model = await getModelFromEntity(SingleIdGameEntity);
    const [first, second] = await model.insertMany([{ name: 'chess' }, { name: 'go' }]);
    return { model, firstId: first._id.toString(), secondId: second._id.toString() };
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe.each([
    ['route validation only', false],
    ['app-level validation', true],
  ])('with %s', (_, withAppValidation) => {
    it('should delete a single document with ?ids=x', async () => {
      const { model, firstId } = await setup(withAppValidation);

      const { status, body } = await server.delete('/single-id-games', { query: { ids: firstId } });

      expect(status).toBe(200);
      expect(body).toEqual({ deletedCount: 1 });
      await expect(model.countDocuments()).resolves.toBe(1);
    });

    it('should delete every document with repeated ids', async () => {
      const { model, firstId, secondId } = await setup(withAppValidation);

      const { status, body } = await server.delete('/single-id-games', { query: { ids: [firstId, secondId] } });

      expect(status).toBe(200);
      expect(body).toEqual({ deletedCount: 2 });
      await expect(model.countDocuments()).resolves.toBe(0);
    });

    it('should update a single document with ?ids=x', async () => {
      const { firstId } = await setup(withAppValidation);

      const { status, body } = await server.patch('/single-id-games', { name: 'shogi' }, { query: { ids: firstId } });

      expect(status).toBe(200);
      expect(body).toEqual([expect.objectContaining({ id: firstId, name: 'shogi' })]);
    });

    it('should duplicate a single document with ?ids=x', async () => {
      const { model, firstId } = await setup(withAppValidation);

      const { status, body } = await server.post('/single-id-games/duplicate', {}, { query: { ids: firstId } });

      expect(status).toBe(201);
      expect(body).toEqual([expect.objectContaining({ name: 'chess' })]);
      await expect(model.countDocuments()).resolves.toBe(3);
    });
  });

  it('should still reject a DeleteMany without ids', async () => {
    await setup(false);

    const { status } = await server.delete('/single-id-games');

    expect(status).toBe(400);
  });
});
