import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiForRootOptions, DynamicApiModule } from '../src';
import { closeTestingApp, createTestingApp } from './e2e.setup';
import 'dotenv/config';

describe('DynamicApiModule forRoot (e2e)', () => {
  let app: INestApplication;
  const uri = process.env.MONGO_DB_URL;

  class UserEntity extends BaseEntity {
    login: string;
    pass: string;
  }

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should initialize dynamic api module state with default options', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DynamicApiModule.forRoot(uri)],
    }).compile();
    app = await createTestingApp(moduleRef);

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: true,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: [],
      credentials: null,
      isAuthEnabled: false,
      jwtSecret: undefined,
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
    });
  });

  it('should initialize dynamic api module state with custom options', async () => {
    const dynamicApiForRootOptions: DynamicApiForRootOptions<UserEntity> = {
      useGlobalCache: false,
      cacheOptions: {
        excludePaths: ['/fake-path'],
      },
      useAuth: {
        userEntity: UserEntity,
        login: {
          loginField: 'login',
          passwordField: 'pass',
        },
        jwt: {
          secret: 'custom-secret',
        },
      },
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DynamicApiModule.forRoot(uri, dynamicApiForRootOptions)],
    }).compile();

    app = await createTestingApp(moduleRef);

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: false,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: ['/fake-path'],
      credentials: {
        loginField: 'login',
        passwordField: 'pass',
      },
      isAuthEnabled: true,
      jwtSecret: 'custom-secret',
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
    });
  });
});
