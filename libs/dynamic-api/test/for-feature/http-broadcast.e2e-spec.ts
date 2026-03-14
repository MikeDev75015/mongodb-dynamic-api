import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
} from '../../src';
import {
  closeTestingApp,
  handleSocketBroadcast,
  server,
  TestSocketAdapter,
} from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

describe('DynamicApiModule forFeature - HTTP Broadcast (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'hb_products' })
  class HbProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Boolean, default: false })
    inStock: boolean;

    @Prop({ type: String })
    status?: string;
  }

  const customEvent = 'hb-product-custom-event';
  let firstProduct: HbProductEntity;
  let secondProduct: HbProductEntity;

  beforeEach(async () => {
    const fixtures = async (_: Connection) => {
      const model = await getModelFromEntity(HbProductEntity);
      await model.insertMany([
        { name: 'mayo', inStock: true },
        { name: 'ketchup', inStock: false },
      ]).then(([mayoProduct, ketchupProduct]) => {
        firstProduct = mayoProduct as unknown as HbProductEntity;
        secondProduct = ketchupProduct as unknown as HbProductEntity;
      });
    };

    await initApp(
      {
        entity: HbProductEntity,
        controllerOptions: {
          apiTag: 'HbProduct',
          path: 'hb-products',
          isPublic: true,
        },
        routes: [
          { type: 'GetMany', isPublic: true },
          {
            type: 'CreateOne',
            broadcast: { enabled: true },
          },
          {
            type: 'CreateMany',
            broadcast: { enabled: (data: HbProductEntity) => data.inStock === true },
          },
          {
            type: 'UpdateOne',
            broadcast: { enabled: true, eventName: customEvent },
          },
          {
            type: 'UpdateMany',
            broadcast: { enabled: false },
          },
          {
            type: 'ReplaceOne',
            broadcast: { enabled: true },
          },
          {
            type: 'DuplicateOne',
            broadcast: { enabled: true },
          },
          {
            type: 'DuplicateMany',
            broadcast: { enabled: true },
          },
          {
            type: 'DeleteOne',
            broadcast: { enabled: true },
          },
          {
            type: 'DeleteMany',
            broadcast: { enabled: true },
          },
        ],
      },
      undefined,
      fixtures,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new TestSocketAdapter(app));
      },
      true,
    );
  });

  it('[CreateOne] should broadcast created product to all WS clients after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      '/hb-products',
      { name: 'mustard', inStock: true },
      { broadcastEvent: 'create-one-hb-product' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'create-one-hb-product',
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'mustard', inStock: true }),
      ]),
    });
    expect(broadcastData).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'mustard', inStock: true }),
    ]));
  });

  it('[CreateMany] should broadcast only inStock products after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      '/hb-products/many',
      { list: [{ name: 'pickles', inStock: true }, { name: 'onions', inStock: false }] },
      { broadcastEvent: 'create-many-hb-product' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'pickles', inStock: true })]),
    );
    expect(broadcastData).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'onions' })]),
    );
  });

  it('[UpdateOne] should broadcast updated product with custom event name after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'patch',
      `/hb-products/${firstProduct.id}`,
      { name: 'updated mayo', inStock: false },
      { broadcastEvent: customEvent },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: customEvent,
      data: expect.arrayContaining([
        expect.objectContaining({ id: firstProduct.id, name: 'updated mayo', inStock: false }),
      ]),
    });
    expect(broadcastData).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'updated mayo' }),
    ]));
  });

  it('[ReplaceOne] should broadcast replaced product after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'put',
      `/hb-products/${firstProduct.id}`,
      { name: 'replaced mayo', inStock: false },
      { broadcastEvent: 'replace-one-hb-product' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstProduct.id, name: 'replaced mayo', inStock: false }),
    ]));
  });

  it('[DuplicateOne] should broadcast duplicated product after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      `/hb-products/duplicate/${firstProduct.id}`,
      { name: 'duplicated mayo' },
      { broadcastEvent: 'duplicate-one-hb-product' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'duplicated mayo', inStock: firstProduct.inStock }),
    ]));
  });

  it('[DuplicateMany] should broadcast duplicated products after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'post',
      '/hb-products/duplicate',
      { status: 'dup' },
      {
        broadcastEvent: 'duplicate-many-hb-product',
        query: { ids: [firstProduct.id, secondProduct.id] },
      },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData.length).toBeGreaterThanOrEqual(2);
  });

  it('[DeleteOne] should broadcast deleted product id to all WS clients after HTTP call', async () => {
    const { broadcastData } = await server.httpWithBroadcast(
      'delete',
      `/hb-products/${firstProduct.id}`,
      {},
      { broadcastEvent: 'delete-one-hb-product' },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'delete-one-hb-product',
      data: expect.arrayContaining([expect.objectContaining({ id: firstProduct.id })]),
    });
    expect(broadcastData).toEqual(expect.arrayContaining([{ id: firstProduct.id }]));
  });

  it('[DeleteMany] should broadcast deleted product ids to all WS clients after HTTP call', async () => {
    const ids = [firstProduct.id, secondProduct.id];
    const { broadcastData } = await server.httpWithBroadcast(
      'delete',
      '/hb-products',
      {},
      {
        broadcastEvent: 'delete-many-hb-product',
        query: { ids },
      },
    );

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(broadcastData).toEqual(expect.arrayContaining(ids.map(id => ({ id }))));
  });

  it('[UpdateMany] should NOT broadcast when enabled is false', async () => {
    const { body: products } = await server.get('/hb-products');
    const ids = products.map((p: HbProductEntity) => p.id);

    const response = await server.patch(
      `/hb-products/many?ids=${ids.join('&ids=')}`,
      { status: 'updated' },
    );

    expect(response).toBeDefined();
    expect(handleSocketBroadcast).not.toHaveBeenCalled();
  });
});

