import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { initModule } from '../shared';

describe('DynamicApiModule forRoot - Initialization (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should initialize dynamic api module state with default options', async () => {
    const app = await initModule({});

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: true,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: [],
      cacheKeyBy: 'url+identity',
      credentials: null,
      isAuthEnabled: false,
      jwtExpirationTime: undefined,
      jwtRefreshTokenExpiresIn: undefined,
      jwtRefreshSecret: undefined,
      jwtRefreshUseCookie: undefined,
      onAfterSaveError: undefined,
      jwtSecret: undefined,
      refreshTokenField: undefined,
      additionalRequestFields: [],
      routesConfig: {
        defaults: [
          'GetMany',
          'GetOne',
          'CreateMany',
          'CreateOne',
          'UpdateMany',
          'UpdateOne',
          'ReplaceOne',
          'DuplicateMany',
          'DuplicateOne',
          'DeleteMany',
          'DeleteOne',
        ],
        excluded: [],
      },
      gatewayOptions: undefined,
    });
  });

  it('should initialize dynamic api module state with custom options', async () => {
    const app = await initModule({
      useGlobalCache: false,
      cacheOptions: {
        excludePaths: ['/fake-path'],
      },
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
    });

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: false,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: ['/fake-path'],
      cacheKeyBy: 'url+identity',
      credentials: null,
      isAuthEnabled: false,
      jwtExpirationTime: undefined,
      jwtRefreshTokenExpiresIn: undefined,
      jwtRefreshSecret: undefined,
      jwtRefreshUseCookie: undefined,
      onAfterSaveError: undefined,
      jwtSecret: undefined,
      refreshTokenField: undefined,
      additionalRequestFields: [],
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
      gatewayOptions: undefined,
    });
  });
});
