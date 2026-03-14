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

describe('DynamicApiModule forFeature - Websockets (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'users' })
  class UserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: Boolean, default: false })
    isAdmin?: boolean;
  }

  @Schema({ collection: 'products' })
  class ProductEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Boolean, default: false })
    inStock: boolean;

    @Prop({ type: String })
    status?: string;
  }

  const customEvent = 'product-custom-event';
  let adminAccessToken: string;
  let userAccessToken: string;
  let firstProduct: ProductEntity;
  let secondProduct: ProductEntity;

  beforeEach(async () => {
    const fixtures = async (_: Connection) => {
      const model = await getModelFromEntity(ProductEntity);
      await model.insertMany([
        { name: 'mayo', inStock: true },
        { name: 'ketchup' },
      ]).then(([mayoProduct, ketchupProduct]) => {
        firstProduct = mayoProduct as unknown as ProductEntity;
        secondProduct = ketchupProduct as unknown as ProductEntity;
      });
    };

    await initApp(
      {
        entity: ProductEntity,
        controllerOptions: {
          apiTag: 'Product',
          path: 'products',
        },
        routes: [
          { type: 'GetMany', isPublic: true },
          {
            type: 'CreateMany',
            webSocket: true,
            broadcast: {
              enabled: (_, user) => user.isAdmin === true,
            },
          },
          {
            type: 'CreateOne',
            webSocket: true,
            broadcast: { enabled: true },
          },
          {
            type: 'UpdateMany',
            webSocket: true,
            broadcast: {
              enabled: false,
              eventName: customEvent,
            },
          },
          {
            type: 'UpdateOne',
            webSocket: true,
            broadcast: {
              enabled: true,
              eventName: customEvent,
            },
          },
          {
            type: 'ReplaceOne',
            webSocket: true,
            broadcast: {
              enabled: true,
            },
          },
          {
            type: 'DuplicateOne',
            webSocket: true,
            broadcast: {
              enabled: (_, user) => user.isAdmin === true,
              eventName: customEvent,
            },
          },
          {
            type: 'DuplicateMany',
            webSocket: true,
            broadcast: {
              enabled: true,
            },
          },
          {
            type: 'DeleteOne',
            webSocket: true,
            broadcast: {
              enabled: true,
            },
          },
          {
            type: 'DeleteMany',
            webSocket: true,
            broadcast: {
              enabled: true,
            },
          },
        ],
      },
      {
        useAuth: {
          userEntity: UserEntity,
          login: {
            additionalFields: ['isAdmin'],
          },
          webSocket: true,
        },
      },
      fixtures,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new TestSocketAdapter(app));
      },
      true,
    );

    adminAccessToken = (await server.emit(
      'auth-register',
      { email: 'unit@test.co', password: 'test', isAdmin: true },
    )).accessToken;
    userAccessToken = (await server.emit(
      'auth-register',
      { email: 'toto@test.co', password: 'test' },
    )).accessToken;
  });

  it('[CreateOne] should broadcast created product to all clients', async () => {
    await server.emit('create-one-product', { name: 'mustard', inStock: true }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'create-one-product',
      data: expect.arrayContaining([
        expect.objectContaining({
          name: 'mustard',
          inStock: true,
        }),
      ]),
    });
  });

  it('[CreateMany] should broadcast created products to all clients when admin', async () => {
    await server.emit('create-many-product', {
      list: [
        { name: 'mustard', inStock: true },
        { name: 'relish', inStock: false },
      ],
    }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'create-many-product',
      data: expect.arrayContaining([
        expect.objectContaining({
          name: 'mustard',
          inStock: true,
        }),
        expect.objectContaining({
          name: 'relish',
          inStock: false,
        }),
      ]),
    });
  });

  it('[CreateMany] should NOT broadcast created products when user is not admin', async () => {
    await server.emit('create-many-product', {
      list: [
        { name: 'pickles', inStock: true },
        { name: 'onions', inStock: false },
      ],
    }, { accessToken: userAccessToken });

    expect(handleSocketBroadcast).not.toHaveBeenCalled();
  });

  it('[UpdateOne] should broadcast updated product to all clients with custom event name', async () => {
    await server.emit('update-one-product', {
      id: firstProduct.id,
      name: 'updated mayo',
      inStock: false,
    }, { accessToken: adminAccessToken, broadcastEvent: customEvent, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: customEvent,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: firstProduct.id,
          name: 'updated mayo',
          inStock: false,
        }),
      ]),
    });
  });

  it('[UpdateMany] should NOT broadcast updated products when broadcast is disabled', async () => {
    const { body: products } = await server.get('/products');

    await server.emit('update-many-product', {
      ids: products.map(p => p.id),
      status: 'updated',
    }, { accessToken: adminAccessToken });

    expect(handleSocketBroadcast).not.toHaveBeenCalled();
  });

  it('[DeleteOne] should broadcast deleted product id to all clients', async () => {
    await server.emit('delete-one-product', {
      id: firstProduct.id,
    }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'delete-one-product',
      data: expect.arrayContaining([
        expect.objectContaining({
          id: firstProduct.id,
        }),
      ]),
    });
  });

  it('[ReplaceOne] should broadcast replaced product to all clients', async () => {
    await server.emit('replace-one-product', {
      id: firstProduct.id,
      name: 'replaced mayo',
      inStock: false,
    }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'replace-one-product',
      data: expect.arrayContaining([
        expect.objectContaining({
          id: firstProduct.id,
          name: 'replaced mayo',
          inStock: false,
        }),
      ]),
    });
  });

  it('[DuplicateOne] should broadcast duplicated product to all clients with custom event name when admin', async () => {
    await server.emit('duplicate-one-product', {
      id: firstProduct.id,
      name: 'duplicated mayo',
    }, { accessToken: adminAccessToken, broadcastEvent: customEvent, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: customEvent,
      data: expect.arrayContaining([
        expect.objectContaining({
          name: 'duplicated mayo',
          inStock: firstProduct.inStock,
        }),
      ]),
    });
  });

  it('[DuplicateOne] should NOT broadcast duplicated product when user is not admin', async () => {
    await server.emit('duplicate-one-product', {
      id: firstProduct.id,
      name: 'duplicated mayo user',
    }, { accessToken: userAccessToken });

    expect(handleSocketBroadcast).not.toHaveBeenCalled();
  });

  it('[DuplicateMany] should broadcast duplicated products to all clients', async () => {
    await server.emit('duplicate-many-product', {
      ids: [secondProduct.id, firstProduct.id],
      status: 'duplicated',
    }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'duplicate-many-product',
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: secondProduct.name,
          inStock: secondProduct.inStock,
          status: 'duplicated',
        }),
        expect.objectContaining({
          id: expect.any(String),
          name: firstProduct.name,
          inStock: firstProduct.inStock,
          status: 'duplicated',
        }),
      ]),
    });
  });

  it('[DeleteMany] should broadcast deleted product ids to all clients', async () => {
    const products = [firstProduct, secondProduct];

    await server.emit('delete-many-product', {
      ids: products.map(p => p.id),
    }, { accessToken: adminAccessToken, expectBroadcast: true });

    expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
    expect(handleSocketBroadcast).toHaveBeenCalledWith({
      event: 'delete-many-product',
      data: expect.arrayContaining(
        products.map(p => ({ id: p.id })),
      ),
    });
  });
});

