import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import mongoose from 'mongoose';
import * as supertest from 'supertest';
import { io } from 'socket.io-client';

type RequestOptions<Query extends object = any> = {
  query?: Query;
  authToken?: string;
  headers?: Record<string, unknown>;
};

type SocketOptions = {
  accessToken?: string;
  namespace?: string;
};

const truncateMongoDb = async (): Promise<void> => {
  const connection = await mongoose.createConnection(`${process.env.MONGO_DB_URL}`).asPromise();
  const collections = await connection.db.collections();
  if (!collections?.length) {
    return;
  }

  await Promise.all(collections.map((c) => c.drop()));
  await connection.close();
};

const verifyApp = () => {
  if (!global.app?.getHttpServer) {
    throw new Error('App is not initialized');
  }

  return supertest.agent(global.app.getHttpServer());
};

export async function createTestingApp(
  moduleRef: TestingModule,
  initFixtures?: (connection: mongoose.Connection) => Promise<void>,
  initMainCb?: (app: INestApplication) => Promise<void>,
) {
  global.app = moduleRef.createNestApplication();

  if (initMainCb) {
    await initMainCb(global.app);
  }

  await global.app.init();

  await truncateMongoDb();

  if (initFixtures) {
    const connection = await mongoose.createConnection(`${process.env.MONGO_DB_URL}`).asPromise();
    await initFixtures(connection);
    await connection.close();
  }

  return global.app;
}

export async function closeTestingApp(connections: mongoose.Connection[]): Promise<void> {
  if (!global.app) {
    return;
  }

  await global.app.close();

  if (connections?.length) {
    await Promise.all(connections.map((c) => c.close()));
  }
}

export const handleSocketException = jest.fn();

export const handleSocketResponse = jest.fn();

export const server = {
  get: async <Query extends object = any, Response = any>(path: string, { authToken, query, headers = {} }: RequestOptions<Query> = {}): Promise<Response> => {
    return verifyApp()
    .get(path)
    .query(query ?? {})
    .set({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36',
      ...headers,
    }) as unknown as Promise<Response>;
  },
  post: async <Body extends object, Response = any, Query extends object = any>(path: string, body: Body, { authToken, query, headers = {} }: RequestOptions<Query> = {}): Promise<Response> => {
    return verifyApp()
    .post(path)
    .query(query ?? {})
    .send(body)
    .set({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36',
      ...headers,
    }) as unknown as Promise<Response>;
  },
  patch: async <Body extends object, Response = any, Query extends object = any>(path: string, body: Body, { authToken, query, headers = {} }: RequestOptions<Query> = {}): Promise<Response> => {
    return verifyApp()
    .patch(path)
    .query(query ?? {})
    .send(body)
    .set({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36',
      ...headers,
    }) as unknown as Promise<Response>;
  },
  put: async <Body extends object, Response = any, Query extends object = any>(path: string, body: Body, { authToken, query, headers = {} }: RequestOptions<Query> = {}): Promise<Response> => {
    return verifyApp()
    .put(path)
    .query(query ?? {})
    .send(body)
    .set({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36',
      ...headers,
    }) as unknown as Promise<Response>;
  },
  delete: async <Query extends object = any, Response = any>(path: string, { authToken, query, headers = {} }: RequestOptions<Query> = {}): Promise<Response> => {
    return verifyApp()
    .delete(path)
    .query(query ?? {})
    .set({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36',
      ...headers,
    }) as unknown as Promise<Response>;
  },
  emit: async <Data, Response = any>(event: string, data?: Data, { accessToken, namespace }: SocketOptions = {}): Promise<Response> => {
    verifyApp();

    try {
      await global.app.getUrl();
    } catch {
      await global.app.listen(8080);
    }

    return new Promise<Response>((resolve) => {
      const ws = io('http://localhost:8080', { query: { accessToken }, path: namespace });

      ws.on('exception', (exception) => {
        handleSocketException(exception);
        ws.close();
        resolve(exception);
      });

      ws.on(event, (data) => {
        handleSocketResponse(data);
        ws.close();
        resolve(data);
      });

      ws.emit(event, data);
    });
  },
};

@WebSocketGateway()
export class TestGateway {
  @SubscribeMessage('test')
  test(@MessageBody() data: any) {
    return { event: 'test', data };
  }
}
