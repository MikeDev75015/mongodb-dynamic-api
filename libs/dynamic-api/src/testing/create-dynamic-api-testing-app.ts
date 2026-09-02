import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DynamicApiModule } from '../dynamic-api.module';
import { DynamicApiForRootOptions } from '../interfaces';

/**
 * Options for {@link createDynamicApiTestingApp}.
 */
interface CreateDynamicApiTestingAppOptions {
  /**
   * MongoDB connection URI. Omit to spin up an in-memory MongoDB automatically —
   * requires the optional `mongodb-memory-server` package (`npm install --save-dev mongodb-memory-server`).
   */
  uri?: string;
  /** Options forwarded to `DynamicApiModule.forRoot()`. */
  forRootOptions?: DynamicApiForRootOptions;
  /**
   * Additional NestJS module imports — typically your `DynamicApiModule.forFeature(...)` calls
   * for the entities under test, plus anything else your test module needs.
   */
  imports?: ModuleMetadata['imports'];
  providers?: ModuleMetadata['providers'];
  controllers?: ModuleMetadata['controllers'];
}

/** Return value of {@link createDynamicApiTestingApp}. */
interface DynamicApiTestingApp {
  /** The initialized Nest application — pass `app.getHttpServer()` to `supertest`. */
  app: INestApplication;
  /** The MongoDB URI actually used (your own `uri`, or the in-memory server's). */
  uri: string;
  /** Closes the Nest app and, if one was started, stops the in-memory MongoDB server. */
  close(): Promise<void>;
}

/**
 * Builds and initializes a Nest testing application wired to `DynamicApiModule`, backed by an
 * in-memory MongoDB — no Docker/external MongoDB required for e2e tests.
 *
 * Pass your own `uri` to point it at a real MongoDB instead (e.g. in CI where one is already
 * running) — the in-memory server is only started when `uri` is omitted.
 *
 * @example — zero-config, in-memory MongoDB
 * ```typescript
 * import { createDynamicApiTestingApp } from 'mongodb-dynamic-api/testing';
 * import * as request from 'supertest';
 *
 * describe('Users (e2e)', () => {
 *   let testingApp: Awaited<ReturnType<typeof createDynamicApiTestingApp>>;
 *
 *   beforeAll(async () => {
 *     testingApp = await createDynamicApiTestingApp({
 *       imports: [DynamicApiModule.forFeature({ entity: User, controllerOptions: { path: 'users' } })],
 *     });
 *   });
 *
 *   afterAll(() => testingApp.close());
 *
 *   it('GET /users', () => {
 *     return request(testingApp.app.getHttpServer()).get('/users').expect(200);
 *   });
 * });
 * ```
 */
async function createDynamicApiTestingApp(
  options: CreateDynamicApiTestingAppOptions = {},
): Promise<DynamicApiTestingApp> {
  const { imports = [], providers = [], controllers = [], forRootOptions = {} } = options;

  let uri = options.uri;
  let stopMemoryServer: (() => Promise<void>) | undefined;

  if (!uri) {
    let mongodbMemoryServer: typeof import('mongodb-memory-server');

    try {
      // Lazy import: mongodb-memory-server is an optional dependency, only needed when the
      // caller doesn't pass its own `uri`.
      mongodbMemoryServer = await import('mongodb-memory-server');
    } catch {
      throw new Error(
        '[DynamicAPI] createDynamicApiTestingApp: no `uri` was provided, so an in-memory MongoDB '
        + 'is needed, which requires the optional "mongodb-memory-server" package. '
        + 'Install it with: npm install --save-dev mongodb-memory-server — or pass your own `uri`.',
      );
    }

    const mongoServer = await mongodbMemoryServer.MongoMemoryServer.create();
    uri = mongoServer.getUri();
    stopMemoryServer = async () => {
      await mongoServer.stop();
    };
  }

  const moduleRef = await Test.createTestingModule({
    imports: [DynamicApiModule.forRoot(uri, forRootOptions), ...imports],
    providers,
    controllers,
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    uri,
    close: async () => {
      await app.close();
      await stopMemoryServer?.();
    },
  };
}

export { createDynamicApiTestingApp, CreateDynamicApiTestingAppOptions, DynamicApiTestingApp };
