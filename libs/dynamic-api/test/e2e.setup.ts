import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import mongoose from 'mongoose';
import * as supertest from 'supertest';
import { io, Socket } from 'socket.io-client';
import { TestSocketAdapter } from './test-socket-adapter';

export { TestSocketAdapter };

type RequestOptions<Query extends object = any> = {
  query?: Query;
  authToken?: string;
  headers?: Record<string, unknown>;
};

type SocketOptions = {
  accessToken?: string;
  namespace?: string;
  broadcastEvent?: string;
  expectBroadcast?: boolean;
  timeoutMs?: number;
  connectTimeoutMs?: number;
};

const DEFAULT_SOCKET_TIMEOUT_MS = 5000;
const DEFAULT_SOCKET_CONNECT_TIMEOUT_MS = 5000;

const toError = (error: unknown, fallbackMessage: string): Error => {
  return error instanceof Error ? error : new Error(fallbackMessage);
};

const waitForSocketConnect = async (socket: Socket, socketName: string, connectTimeoutMs: number): Promise<void> => {
  if (socket.connected) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let lastConnectError: Error | undefined;

    const onConnect = () => {
      clearTimeout(timeoutRef);
      socket.off('connect_error', onConnectError);
      resolve();
    };

    const onConnectError = (error: unknown) => {
      lastConnectError = toError(error, `${socketName} socket failed to connect`);
    };

    const timeoutRef = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      reject(lastConnectError ?? new Error(`${socketName} socket connection timed out after ${connectTimeoutMs}ms`));
    }, connectTimeoutMs);

    socket.on('connect_error', onConnectError);
    socket.once('connect', onConnect);
  });
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

  await global.app.listen(8080);

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

export const handleSocketBroadcast = jest.fn();

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
  emit: async <Data, Response = any>(event: string, data?: Data, { accessToken, namespace, broadcastEvent, expectBroadcast = false, timeoutMs = DEFAULT_SOCKET_TIMEOUT_MS, connectTimeoutMs = DEFAULT_SOCKET_CONNECT_TIMEOUT_MS }: SocketOptions = {}): Promise<Response> => {
    verifyApp();

    return new Promise<Response>((resolve, reject) => {
      const emitter = io('http://localhost:8080', { query: { accessToken }, path: namespace });
      const receiver = expectBroadcast ? io('http://localhost:8080', { path: namespace }) : undefined;
      const receiverEvent = broadcastEvent || event;
      let settled = false;
      let responseReceived = false;
      let broadcastReceived = !expectBroadcast;
      let responseValue: Response;
      let timeoutRef: NodeJS.Timeout | undefined;

      const cleanup = () => {
        emitter.removeAllListeners();
        emitter.disconnect();
        emitter.close();
        if (receiver) {
          receiver.removeAllListeners();
          receiver.disconnect();
          receiver.close();
        }
      };

      const finalize = (result?: Response, error?: Error) => {
        if (settled) {
          return;
        }

        settled = true;

        if (timeoutRef) {
          clearTimeout(timeoutRef);
        }

        cleanup();

        if (error) {
          reject(error);
          return;
        }

        resolve(result as Response);
      };

      const tryFinalize = () => {
        if (responseReceived && broadcastReceived) {
          finalize(responseValue);
        }
      };

      if (receiver) {
        receiver.on(receiverEvent, (receivedData) => {
          handleSocketBroadcast({ event: receiverEvent, data: receivedData });
          broadcastReceived = true;
          tryFinalize();
        });
      }

      emitter.on('exception', (exception) => {
        handleSocketException(exception);
        responseValue = exception as Response;
        responseReceived = true;
        tryFinalize();
      });

      emitter.on(event, (receivedData) => {
        handleSocketResponse(receivedData);
        responseValue = receivedData as Response;
        responseReceived = true;
        tryFinalize();
      });

      timeoutRef = setTimeout(() => {
        finalize(
          undefined,
          new Error(`Socket event timeout after ${timeoutMs}ms (responseReceived=${responseReceived}, broadcastReceived=${broadcastReceived}, expectBroadcast=${expectBroadcast}, event=${event}, broadcastEvent=${receiverEvent})`),
        );
      }, timeoutMs);

      const connectPromises = [waitForSocketConnect(emitter, 'Emitter', connectTimeoutMs)];
      if (receiver) {
        connectPromises.push(waitForSocketConnect(receiver, 'Receiver', connectTimeoutMs));
      }

      Promise.all(connectPromises)
        .then(() => {
          emitter.emit(event, data);
        })
        .catch((error) => {
          finalize(undefined, toError(error, 'Socket connection failed'));
        });
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
