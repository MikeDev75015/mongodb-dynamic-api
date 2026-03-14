import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { DynamicApiForRootOptions, DynamicApiModule } from '../../src';
import { createTestingApp, TestGateway } from '../e2e.setup';

/**
 * Shared initModule factory for forRoot e2e tests.
 * Reads MONGO_DB_URL from the environment at call time.
 */
export const initModule = async (
  dynamicApiForRootOptions: DynamicApiForRootOptions,
  initFixtures?: (connection: mongoose.Connection) => Promise<void>,
  initMainCb?: (app: INestApplication) => Promise<void>,
  testGateway?: boolean,
): Promise<INestApplication> => {
  const uri = process.env.MONGO_DB_URL;

  const moduleRef = await Test.createTestingModule({
    imports: [DynamicApiModule.forRoot(uri, dynamicApiForRootOptions)],
    providers: testGateway ? [TestGateway] : [],
  }).compile();

  return createTestingApp(moduleRef, initFixtures, initMainCb);
};

