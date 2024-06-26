import { TestingModule } from '@nestjs/testing';
import mongoose from 'mongoose';
import * as supertest from 'supertest';

type RequestOptions<Query extends object = any> = {
  query?: Query;
  authToken?: string;
  headers?: Record<string, unknown>;
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

export async function createTestingApp(
  moduleRef: TestingModule,
  initFixtures?: (connection: mongoose.Connection) => Promise<void>,
  initMainCb?: (app: any) => Promise<void>,
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

const verifyApp = () => {
  if (!global.app?.getHttpServer) {
    throw new Error('App is not initialized');
  }

  return supertest.agent(global.app.getHttpServer());
};

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
};
