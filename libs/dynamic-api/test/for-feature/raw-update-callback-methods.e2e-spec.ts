import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import {
  AfterSaveCallback,
  BaseEntity,
  DynamicApiModule,
  MongoUpdateOperators,
} from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';

/**
 * E2E — rawUpdateOneDocument & rawUpdateManyDocuments in callbacks
 *
 * Strategy: use afterSave callbacks that apply a raw MongoDB operator
 * to a SideEffectEntity, then verify the result via GET requests.
 * Invalid-key guard is tested by having the callback throw and
 * checking the HTTP route returns 500 / the guard kicks in.
 */

// ── Entities ──────────────────────────────────────────────────────

@Schema({ collection: 'raw-update-products' })
class ProductEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String })
  category: string;

  @Prop({ type: String })
  legacyField: string;

  @Prop({ type: String })
  renamedField: string;
}

@Schema({ collection: 'raw-update-counters' })
class CounterEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, default: 0 })
  value: number;

  @Prop({ type: [String], default: [] })
  items: string[];
}

// ── Helpers ───────────────────────────────────────────────────────

type ProductResponse = {
  id: string;
  name: string;
  stock: number;
  tags: string[];
  category: string;
  legacyField?: string;
  renamedField?: string;
};

async function buildApp(
  routes: Parameters<typeof DynamicApiModule.forFeature>[0]['routes'],
) {
  DynamicApiModule.state['resetState']();
  const uri = process.env.MONGO_DB_URL;

  const moduleRef = await Test.createTestingModule({
    imports: [
      DynamicApiModule.forRoot(uri),
      DynamicApiModule.forFeature({
        entity: ProductEntity,
        controllerOptions: { path: 'products' },
        routes,
      }),
      DynamicApiModule.forFeature({
        entity: CounterEntity,
        controllerOptions: { path: 'counters' },
      }),
    ],
  }).compile();

  await createTestingApp(moduleRef);
}

// ── Suite ─────────────────────────────────────────────────────────

describe('rawUpdateOneDocument & rawUpdateManyDocuments in callbacks (e2e)', () => {

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── $set ────────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $set', () => {
    it('should update specific fields of a cross-collection document after CreateOne', async () => {
      // afterSave: create a CounterEntity then $set its value to 42
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        const counter = await methods.createOneDocument(CounterEntity, { key: product.id, value: 0 });
        await methods.rawUpdateOneDocument(
          CounterEntity,
          { _id: counter.id },
          { $set: { value: 42 } } as MongoUpdateOperators<CounterEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }]);

      const { body: product, status } = await server.post('/products', { name: 'widget', stock: 5, tags: [] }) as any;
      expect(status).toBe(201);

      const { body: counters } = await server.get('/counters') as any;
      const counter = counters.find((c: any) => c.key === product.id);
      expect(counter).toBeDefined();
      expect(counter.value).toBe(42);
    });
  });

  // ── $unset ───────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $unset', () => {
    it('should remove a field from the document', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $unset: { category: '' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([
        { type: 'CreateOne' },
        { type: 'UpdateOne', callback },
        { type: 'GetOne' },
      ]);

      // Create with a category
      const { body: created } = await server.post('/products', { name: 'gadget', stock: 3, tags: [], category: 'electronics' }) as any;
      expect(created.category).toBe('electronics');

      // Update triggers callback that $unsets category
      await server.patch(`/products/${created.id}`, { name: 'gadget-v2' });

      const { body: fetched } = await server.get(`/products/${created.id}`) as any;
      expect(fetched.category).toBeUndefined();
    });
  });

  // ── $inc ─────────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $inc', () => {
    it('should increment a numeric field', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (_product, methods) => {
        const counters = await methods.findManyDocuments(CounterEntity, { key: 'global-views' });
        if (counters.length === 0) {
          await methods.createOneDocument(CounterEntity, { key: 'global-views', value: 0 });
        }
        await methods.rawUpdateOneDocument(
          CounterEntity,
          { key: 'global-views' },
          { $inc: { value: 1 } } as MongoUpdateOperators<CounterEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }]);

      await server.post('/products', { name: 'p1', stock: 1, tags: [] });
      await server.post('/products', { name: 'p2', stock: 2, tags: [] });
      await server.post('/products', { name: 'p3', stock: 3, tags: [] });

      const { body: counters } = await server.get('/counters') as any;
      const viewCounter = counters.find((c: any) => c.key === 'global-views');
      expect(viewCounter).toBeDefined();
      expect(viewCounter.value).toBe(3);
    });
  });

  // ── $push ────────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $push', () => {
    it('should append an element to an array field', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $push: { tags: 'new-arrival' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }, { type: 'GetOne' }]);

      const { body: created } = await server.post('/products', { name: 'sneaker', stock: 10, tags: [] }) as any;
      const { body: fetched } = await server.get(`/products/${created.id}`) as any;

      expect(fetched.tags).toContain('new-arrival');
    });
  });

  // ── $pull ────────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $pull', () => {
    it('should remove matching elements from an array field', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $pull: { tags: 'draft' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([
        { type: 'CreateOne' },
        { type: 'UpdateOne', callback },
        { type: 'GetOne' },
      ]);

      const { body: created } = await server.post('/products', { name: 'book', stock: 5, tags: ['published', 'draft'] }) as any;
      await server.patch(`/products/${created.id}`, { name: 'book-v2' });

      const { body: fetched } = await server.get(`/products/${created.id}`) as any;
      expect(fetched.tags).not.toContain('draft');
      expect(fetched.tags).toContain('published');
    });
  });

  // ── $addToSet ─────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $addToSet', () => {
    it('should add to array only if element is not already present', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        // Called twice — tag should appear only once
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $addToSet: { tags: 'featured' } } as MongoUpdateOperators<ProductEntity>,
        );
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $addToSet: { tags: 'featured' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }, { type: 'GetOne' }]);

      const { body: created } = await server.post('/products', { name: 'lamp', stock: 2, tags: [] }) as any;
      const { body: fetched } = await server.get(`/products/${created.id}`) as any;

      expect(fetched.tags.filter((t: string) => t === 'featured')).toHaveLength(1);
    });
  });

  // ── $pop ──────────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $pop', () => {
    it('should remove the last element from an array field', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $pop: { tags: 1 } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([
        { type: 'CreateOne' },
        { type: 'UpdateOne', callback },
        { type: 'GetOne' },
      ]);

      const { body: created } = await server.post('/products', { name: 'chair', stock: 4, tags: ['first', 'second', 'last'] }) as any;
      await server.patch(`/products/${created.id}`, { name: 'chair-v2' });

      const { body: fetched } = await server.get(`/products/${created.id}`) as any;
      expect(fetched.tags).toEqual(expect.not.arrayContaining(['last']));
      expect(fetched.tags).toContain('first');
    });
  });

  // ── $rename ───────────────────────────────────────────────────────

  describe('rawUpdateOneDocument — $rename', () => {
    it('should rename a field in the document', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await methods.rawUpdateOneDocument(
          ProductEntity,
          { _id: product.id },
          { $rename: { legacyField: 'renamedField' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([
        { type: 'CreateOne' },
        { type: 'UpdateOne', callback },
        { type: 'GetOne' },
      ]);

      const { body: created } = await server.post('/products', { name: 'table', stock: 1, tags: [], legacyField: 'old-value' }) as any;
      await server.patch(`/products/${created.id}`, { name: 'table-v2' });

      const { body: fetched } = await server.get(`/products/${created.id}`) as any;
      expect(fetched.renamedField).toBe('old-value');
      expect(fetched.legacyField).toBeUndefined();
    });
  });

  // ── rawUpdateManyDocuments ─────────────────────────────────────────

  describe('rawUpdateManyDocuments — $inc on multiple documents', () => {
    it('should increment a field on all matching documents', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (_product, methods) => {
        await methods.rawUpdateManyDocuments(
          CounterEntity,
          { key: { $in: ['ctr-a', 'ctr-b'] } },
          { $inc: { value: 5 } } as MongoUpdateOperators<CounterEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }]);

      // Pre-create counters via the counters route
      await server.post('/counters', { key: 'ctr-a', value: 0 });
      await server.post('/counters', { key: 'ctr-b', value: 10 });

      // Trigger callback
      await server.post('/products', { name: 'bulk-item', stock: 1, tags: [] });

      const { body: counters } = await server.get('/counters') as any;
      const ctrA = counters.find((c: any) => c.key === 'ctr-a');
      const ctrB = counters.find((c: any) => c.key === 'ctr-b');
      expect(ctrA.value).toBe(5);
      expect(ctrB.value).toBe(15);
    });
  });

  describe('rawUpdateManyDocuments — $set on filtered documents', () => {
    it('should set a field only on documents matching the filter', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (_product, methods) => {
        // Only set category on products with stock > 5
        await methods.rawUpdateManyDocuments(
          ProductEntity,
          { stock: { $gt: 5 } },
          { $set: { category: 'high-stock' } } as MongoUpdateOperators<ProductEntity>,
        );
      };

      await buildApp([{ type: 'CreateOne', callback }, { type: 'GetMany' }]);

      const { body: p1 } = await server.post('/products', { name: 'low', stock: 2, tags: [] }) as any;
      const { body: p2 } = await server.post('/products', { name: 'high', stock: 100, tags: [] }) as any;

      // Trigger callback one more time on a third product (stock = 1)
      await server.post('/products', { name: 'no-stock', stock: 1, tags: [] });

      const { body: all } = await server.get('/products') as any;
      const low = all.find((p: ProductResponse) => p.id === p1.id);
      const high = all.find((p: ProductResponse) => p.id === p2.id);

      expect(high.category).toBe('high-stock');
      expect(low.category).toBeUndefined();
    });
  });

  // ── Invalid key guard ────────────────────────────────────────────

  describe('runtime guard — invalid key without $', () => {
    it('rawUpdateOneDocument should propagate BadRequestException when a key does not start with $', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (product, methods) => {
        await (methods.rawUpdateOneDocument as (
          entity: unknown,
          filter: unknown,
          update: unknown,
        ) => Promise<unknown>)(
          ProductEntity,
          { _id: product.id },
          { name: 'injected' },  // ← invalid: no $ prefix
        );
      };

      await buildApp([{ type: 'CreateOne', callback }]);

      const { status } = await server.post('/products', { name: 'evil', stock: 0, tags: [] }) as any;
      // The callback throws BadRequestException which NestJS wraps as 500 (uncaught in afterSave)
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it('rawUpdateManyDocuments should propagate BadRequestException when a key does not start with $', async () => {
      const callback: AfterSaveCallback<ProductEntity> = async (_product, methods) => {
        await (methods.rawUpdateManyDocuments as (
          entity: unknown,
          filter: unknown,
          update: unknown,
        ) => Promise<unknown>)(
          ProductEntity,
          {},
          { name: 'injected' },  // ← invalid: no $ prefix
        );
      };

      await buildApp([{ type: 'CreateOne', callback }]);

      const { status } = await server.post('/products', { name: 'evil2', stock: 0, tags: [] }) as any;
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});



