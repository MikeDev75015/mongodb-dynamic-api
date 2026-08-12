import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { DynamicApiEventRegistryStore } from '../../src/helpers/event-registry.store';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

describe('DynamicApiModule forFeature - Broadcast Event Registry (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
    DynamicApiEventRegistryStore.reset();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'ber_products' })
  class BerProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  describe('registration', () => {
    let existingProduct: BerProductEntity;

    beforeEach(async () => {
      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(BerProductEntity);
        existingProduct = (await model.create({ name: 'initial' })) as unknown as BerProductEntity;
      };

      await initApp(
        {
          entity: BerProductEntity,
          controllerOptions: { path: 'ber-products', apiTag: 'BerProduct', isPublic: true },
          routes: [
            { type: 'GetMany', isPublic: true },
            { type: 'CreateOne', broadcast: { enabled: true } },
            { type: 'DeleteOne', broadcast: { enabled: true, eventName: 'ber-product-removed' } },
          ],
        },
        undefined,
        fixtures,
      );
    });

    it('should register the CreateOne broadcast event on the http channel', () => {
      const descriptor = DynamicApiEventRegistryStore.getAll()
        .find((d) => d.event === 'create-one-ber-product');

      expect(descriptor).toMatchObject({
        routeType: 'CreateOne',
        entityName: 'BerProductEntity',
        isCustomEventName: false,
        channels: ['http'],
      });
    });

    it('should register the DeleteOne custom eventName on the http channel only', () => {
      const descriptor = DynamicApiEventRegistryStore.getAll()
        .find((d) => d.event === 'ber-product-removed');

      expect(descriptor).toMatchObject({
        routeType: 'DeleteOne',
        entityName: 'BerProductEntity',
        isCustomEventName: true,
        channels: ['http'],
      });
    });

    it('should not register anything for GetMany (broadcast is not supported on that route)', () => {
      const events = DynamicApiEventRegistryStore.getAll().map((d) => d.event);

      expect(events.some((event) => event.includes('get-many'))).toBe(false);
    });

    it('should still serve requests normally alongside registration', async () => {
      const response = await server.delete(`/ber-products/${existingProduct.id}`);

      expect(response.status).toBe(200);
    });
  });

  describe('collisions across two entities', () => {
    @Schema({ collection: 'ber_categories' })
    class BerCategoryEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      label: string;
    }

    beforeEach(async () => {
      await initApp(
        {
          entity: BerProductEntity,
          controllerOptions: {
            path: 'ber-collision-products',
            apiTag: 'BerCollisionProduct',
            isPublic: true,
          },
          routes: [
            { type: 'CreateOne', broadcast: { enabled: true, eventName: 'shared-collision-event' } },
          ],
          extraImports: [
            DynamicApiModule.forFeature({
              entity: BerCategoryEntity,
              controllerOptions: { path: 'ber-collision-categories', isPublic: true },
              routes: [{ type: 'CreateOne', broadcast: { enabled: true, eventName: 'shared-collision-event' } }],
            }),
          ],
        },
      );
    });

    it('should record the collision without breaking either route', async () => {
      expect(DynamicApiEventRegistryStore.getCollisions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ event: 'shared-collision-event' })]),
      );

      const productResponse = await server.post('/ber-collision-products', { name: 'colliding-product' });
      const categoryResponse = await server.post('/ber-collision-categories', { label: 'colliding-category' });

      expect(productResponse.status).toBe(201);
      expect(categoryResponse.status).toBe(201);
    });
  });
});
