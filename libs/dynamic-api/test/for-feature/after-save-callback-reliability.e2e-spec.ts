import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { AfterSaveCallback, BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for the afterSaveCallback ("callback") reliability guarantee: a throwing/
 * rejecting callback must never corrupt the response of an already-successful primary
 * operation, must never mask DeleteOne/DeleteMany's real deletedCount to 0, must support
 * retrying via callbackRetry, and must surface to the global onAfterSaveError hook.
 */
describe('DynamicApiModule forFeature - afterSaveCallback reliability (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'reliability_items' })
  class ReliabilityItemEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    title: string;
  }

  const throwingCallback: AfterSaveCallback<ReliabilityItemEntity> = async () => {
    throw new Error('afterSaveCallback boom');
  };

  describe('single-entity and batch routes never corrupt the response', () => {
    let existingItem: ReliabilityItemEntity;
    let secondItem: ReliabilityItemEntity;

    beforeEach(async () => {
      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(ReliabilityItemEntity);
        const [a, b] = await model.insertMany([{ title: 'first' }, { title: 'second' }]);
        existingItem = a as unknown as ReliabilityItemEntity;
        secondItem = b as unknown as ReliabilityItemEntity;
      };

      await initApp(
        {
          entity: ReliabilityItemEntity,
          controllerOptions: { path: 'reliability-items', isPublic: true },
          routes: [
            { type: 'GetMany', isPublic: true },
            { type: 'CreateOne', callback: throwingCallback },
            { type: 'CreateMany', callback: throwingCallback },
            { type: 'DeleteOne', callback: throwingCallback },
            { type: 'DeleteMany', callback: throwingCallback },
          ],
        },
        undefined,
        fixtures,
      );
    });

    it('[CreateOne] should return 201 with the created entity despite the callback failing', async () => {
      const { status, body } = await server.post('/reliability-items', { title: 'created' });

      expect(status).toBe(201);
      expect(body).toMatchObject({ title: 'created' });

      const model = await getModelFromEntity(ReliabilityItemEntity);
      const persisted = await model.findOne({ title: 'created' }).lean();
      expect(persisted).not.toBeNull();
    });

    it('[CreateMany] should return 201 with all created entities despite the callback failing', async () => {
      const { status, body } = await server.post('/reliability-items/many', {
        list: [{ title: 'batch-1' }, { title: 'batch-2' }],
      });

      expect(status).toBe(201);
      expect(body).toHaveLength(2);
      expect(body.map((i: ReliabilityItemEntity) => i.title).sort()).toEqual(['batch-1', 'batch-2']);
    });

    it('[DeleteOne] should return the real deletedCount, not 0, despite the callback failing', async () => {
      const { status, body } = await server.delete(`/reliability-items/${existingItem.id}`);

      expect(status).toBe(200);
      expect(body).toEqual({ deletedCount: 1 });

      const model = await getModelFromEntity(ReliabilityItemEntity);
      expect(await model.findById(existingItem.id).lean()).toBeNull();
    });

    it('[DeleteMany] should return the real deletedCount, not 0, despite the callback failing for every document', async () => {
      const { status, body } = await server.delete('/reliability-items', {
        query: { ids: [existingItem.id, secondItem.id] },
      });

      expect(status).toBe(200);
      expect(body).toEqual({ deletedCount: 2 });
    });
  });

  describe('callbackRetry', () => {
    let attempts: number;
    const flakyCallback: AfterSaveCallback<ReliabilityItemEntity> = async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('transient');
      }
    };

    beforeEach(async () => {
      attempts = 0;

      await initApp({
        entity: ReliabilityItemEntity,
        controllerOptions: { path: 'reliability-retry-items', isPublic: true },
        routes: [
          { type: 'CreateOne', callback: flakyCallback, callbackRetry: { attempts: 2 } },
        ],
      });
    });

    it('should retry a failing callback and succeed on the second attempt', async () => {
      const { status, body } = await server.post('/reliability-retry-items', { title: 'retried' });

      expect(status).toBe(201);
      expect(body).toMatchObject({ title: 'retried' });
      expect(attempts).toBe(2);
    });
  });

  describe('onAfterSaveError global hook', () => {
    const onAfterSaveError = jest.fn();

    beforeEach(async () => {
      onAfterSaveError.mockClear();

      await initApp(
        {
          entity: ReliabilityItemEntity,
          controllerOptions: { path: 'reliability-hook-items', isPublic: true },
          routes: [
            { type: 'CreateOne', callback: throwingCallback },
          ],
        },
        { onAfterSaveError },
      );
    });

    it('should invoke the global hook with the error and context when callback fails', async () => {
      const { status } = await server.post('/reliability-hook-items', { title: 'hooked' });

      expect(status).toBe(201);
      expect(onAfterSaveError).toHaveBeenCalledTimes(1);
      expect(onAfterSaveError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          entityName: 'ReliabilityItemEntity',
          entity: expect.objectContaining({ title: 'hooked' }),
        }),
      );
    });
  });
});
