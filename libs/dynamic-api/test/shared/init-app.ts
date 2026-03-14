import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import {
  BaseEntity,
  DynamicApiForFeatureOptions,
  DynamicApiForRootOptions,
  DynamicApiModule,
} from '../../src';
import { createTestingApp, TestGateway } from '../e2e.setup';

/**
 * Shared initApp factory for forFeature e2e tests.
 * Reads MONGO_DB_URL from the environment at call time.
 */
export const initApp = async <Entity extends BaseEntity, UserEntity extends BaseEntity>(
  forFeatureOptions: DynamicApiForFeatureOptions<Entity>,
  forRootOptions: DynamicApiForRootOptions<UserEntity> = {},
  initFixtures?: (connection: Connection) => Promise<void>,
  initMainCb?: (app: any) => Promise<void>,
  testGateway?: boolean,
): Promise<void> => {
  const uri = process.env.MONGO_DB_URL;

  const moduleRef = await Test.createTestingModule({
    imports: [
      DynamicApiModule.forRoot(uri, forRootOptions),
      DynamicApiModule.forFeature(forFeatureOptions),
    ],
    providers: testGateway ? [TestGateway] : [],
  }).compile();

  await createTestingApp(moduleRef, initFixtures, initMainCb);
};

