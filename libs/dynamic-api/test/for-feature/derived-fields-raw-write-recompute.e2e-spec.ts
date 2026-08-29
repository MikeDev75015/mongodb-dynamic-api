import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import {
  AfterSaveCallback,
  BaseEntity,
  CustomRouteConfig,
  DerivedField,
  DynamicApiModule,
  MongoUpdateOperators,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for audit finding F5 — a `@DerivedField({ on: 'save' })` was only ever recomputed
 * by the native CreateOne/UpdateOne pipeline. A write reaching the same entity through
 * `CallbackMethods.updateOneDocument`/`rawUpdateOneDocument` (used from a callback on some other
 * entity, or any other secondary write path) left the derived field silently stale.
 *
 * Entity: DerivedOrderEntity — `total` is derived from `quantity * unitPrice`, on: 'save'.
 */
describe('DynamicApiModule forFeature - @DerivedField recompute on raw writes (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'derived_orders' })
  class DerivedOrderEntity extends BaseEntity {
    @Prop({ type: Number, required: true })
    quantity: number;

    @Prop({ type: Number, required: true })
    unitPrice: number;

    @DerivedField(
      (e: Partial<DerivedOrderEntity>) => (e.quantity ?? 0) * (e.unitPrice ?? 0),
      { on: 'save' },
    )
    @Prop({ type: Number })
    total: number;
  }

  // A second entity whose afterSave callback performs the "secondary path" write on
  // DerivedOrderEntity — mirrors the real shape of the bug: a write to an entity that isn't
  // reached through its own native CreateOne/UpdateOne pipeline at all.
  @Schema({ collection: 'derived_order_adjustments' })
  class OrderAdjustmentEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    orderId: string;

    @Prop({ type: Number, required: true })
    newQuantity: number;
  }

  describe('rawUpdateOneDocument used from another entity\'s callback', () => {
    it('should recompute and persist the derived field, not leave it stale', async () => {
      const callback: AfterSaveCallback<OrderAdjustmentEntity> = async (adjustment, methods) => {
        await methods.rawUpdateOneDocument(
          DerivedOrderEntity,
          { _id: adjustment.orderId },
          { $set: { quantity: adjustment.newQuantity } } as MongoUpdateOperators<DerivedOrderEntity>,
        );
      };

      await initApp({
        entity: OrderAdjustmentEntity,
        controllerOptions: { path: 'order-adjustments', isPublic: true },
        routes: [{ type: 'CreateOne', callback }],
        extraImports: [
          DynamicApiModule.forFeature({
            entity: DerivedOrderEntity,
            controllerOptions: { path: 'derived-orders', isPublic: true },
            routes: [{ type: 'CreateOne' }, { type: 'GetOne' }],
          }),
        ],
      });

      const created = await server.post('/derived-orders', { quantity: 2, unitPrice: 10 });
      expect(created.status).toBe(201);
      expect(created.body.total).toBe(20); // native CreateOne pipeline computes this correctly

      const adjustment = await server.post('/order-adjustments', {
        orderId: created.body.id,
        newQuantity: 5,
      });
      expect(adjustment.status).toBe(201);

      const refreshed = await server.get(`/derived-orders/${created.body.id}`);
      expect(refreshed.body.quantity).toBe(5);
      expect(refreshed.body.total).toBe(50); // 5 * 10 — recomputed, not left at the stale 20
    });
  });

  describe('updateOneDocument used from another entity\'s callback', () => {
    it('should recompute and persist the derived field, not leave it stale', async () => {
      const callback: AfterSaveCallback<OrderAdjustmentEntity> = async (adjustment, methods) => {
        await methods.updateOneDocument(
          DerivedOrderEntity,
          { _id: adjustment.orderId },
          { $set: { quantity: adjustment.newQuantity } },
        );
      };

      await initApp({
        entity: OrderAdjustmentEntity,
        controllerOptions: { path: 'order-adjustments', isPublic: true },
        routes: [{ type: 'CreateOne', callback }],
        extraImports: [
          DynamicApiModule.forFeature({
            entity: DerivedOrderEntity,
            controllerOptions: { path: 'derived-orders', isPublic: true },
            routes: [{ type: 'CreateOne' }, { type: 'GetOne' }],
          }),
        ],
      });

      const created = await server.post('/derived-orders', { quantity: 3, unitPrice: 4 });
      expect(created.body.total).toBe(12);

      await server.post('/order-adjustments', { orderId: created.body.id, newQuantity: 7 });

      const refreshed = await server.get(`/derived-orders/${created.body.id}`);
      expect(refreshed.body.total).toBe(28); // 7 * 4
    });
  });

  describe('a direct model write bypassing MDA entirely', () => {
    it('leaves the derived field stale — proves recomputeDerivedFields must be called explicitly for paths MDA does not control', async () => {
      await initApp({
        entity: DerivedOrderEntity,
        controllerOptions: { path: 'derived-orders', isPublic: true },
        routes: [{ type: 'CreateOne' }, { type: 'GetOne' }],
      });

      const created = await server.post('/derived-orders', { quantity: 2, unitPrice: 10 });
      expect(created.body.total).toBe(20);

      // A write that goes around MDA's CallbackMethods entirely (e.g. a raw Mongoose call from
      // inside a custom route handler — see F8) — nothing recomputes the derived field here.
      const model = await getModelFromEntity(DerivedOrderEntity);
      await model.updateOne({ _id: created.body.id }, { $set: { quantity: 9 } });

      const stale = await server.get(`/derived-orders/${created.body.id}`);
      expect(stale.body.quantity).toBe(9);
      expect(stale.body.total).toBe(20); // stale — quantity changed, total didn't
    });
  });

  describe('a custom route handler using the newly-exposed ctx.methods — closes the gap above', () => {
    it('recomputes the derived field via methods.updateOneDocument, unlike the raw ctx.model write', async () => {
      // Same shape as "a direct model write bypassing MDA entirely" above, except the handler
      // uses ctx.methods.updateOneDocument (CallbackMethods, now exposed on CustomRouteContext)
      // instead of a raw ctx.model.updateOne — that alone is enough to get automatic
      // @DerivedField recompute, with no manual recompute call needed.
      const setQuantityRoute: CustomRouteConfig<DerivedOrderEntity> = {
        path: ':id/quantity',
        method: 'PATCH',
        handler: async ({ params, body, methods }) => {
          await methods.updateOneDocument(
            DerivedOrderEntity,
            { _id: params.id },
            { $set: { quantity: (body as { quantity: number }).quantity } },
          );
          return methods.findOneDocument(DerivedOrderEntity, { _id: params.id });
        },
      };

      await initApp({
        entity: DerivedOrderEntity,
        controllerOptions: { path: 'derived-orders', isPublic: true },
        routes: [{ type: 'CreateOne' }, { type: 'GetOne' }],
        customRoutes: [setQuantityRoute],
      });

      const created = await server.post('/derived-orders', { quantity: 2, unitPrice: 10 });
      expect(created.body.total).toBe(20);

      await server.patch(`/derived-orders/${created.body.id}/quantity`, { quantity: 9 });

      const refreshed = await server.get(`/derived-orders/${created.body.id}`);
      expect(refreshed.body.quantity).toBe(9);
      expect(refreshed.body.total).toBe(90); // 9 * 10 — recomputed via ctx.methods, not stale
    });
  });
});
