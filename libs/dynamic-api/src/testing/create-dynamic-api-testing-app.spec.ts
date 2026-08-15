import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DynamicApiModule } from '../dynamic-api.module';
import { createDynamicApiTestingApp } from './create-dynamic-api-testing-app';

jest.mock('@nestjs/testing', () => ({
  Test: { createTestingModule: jest.fn() },
}));

jest.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { forRoot: jest.fn() },
}));

jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: { create: jest.fn() },
}));

describe('createDynamicApiTestingApp', () => {
  let appMock: INestApplication;
  let moduleRefMock: { createNestApplication: jest.Mock };
  let forRootModule: object;

  beforeEach(() => {
    jest.clearAllMocks();
    appMock = { init: jest.fn(), close: jest.fn() } as unknown as INestApplication;
    moduleRefMock = { createNestApplication: jest.fn().mockReturnValue(appMock) };
    (Test.createTestingModule as jest.Mock).mockReturnValue({
      compile: jest.fn().mockResolvedValue(moduleRefMock),
    });
    forRootModule = { module: 'FakeForRootModule' };
    (DynamicApiModule.forRoot as jest.Mock).mockReturnValue(forRootModule);
  });

  describe('when a uri is provided', () => {
    it('does not touch mongodb-memory-server and uses the given uri', async () => {
      const result = await createDynamicApiTestingApp({ uri: 'mongodb://real-mongo/test' });

      expect(MongoMemoryServer.create).not.toHaveBeenCalled();
      expect(DynamicApiModule.forRoot).toHaveBeenCalledWith('mongodb://real-mongo/test', {});
      expect(result.uri).toBe('mongodb://real-mongo/test');
      expect(result.app).toBe(appMock);
    });

    it('initializes the app and closes only the app (no memory server) on close()', async () => {
      const result = await createDynamicApiTestingApp({ uri: 'mongodb://real-mongo/test' });
      expect(appMock.init).toHaveBeenCalled();

      await result.close();

      expect(appMock.close).toHaveBeenCalled();
    });

    it('forwards forRootOptions, imports, providers and controllers to the testing module', async () => {
      class ExtraController {}
      class ExtraProvider {}
      class ExtraModule {}
      const extraImport = { module: ExtraModule };
      const forRootOptions = { useGlobalCache: false };

      await createDynamicApiTestingApp({
        uri: 'mongodb://real-mongo/test',
        forRootOptions,
        imports: [extraImport],
        providers: [ExtraProvider],
        controllers: [ExtraController],
      });

      expect(DynamicApiModule.forRoot).toHaveBeenCalledWith('mongodb://real-mongo/test', forRootOptions);
      expect(Test.createTestingModule).toHaveBeenCalledWith({
        imports: [forRootModule, extraImport],
        providers: [ExtraProvider],
        controllers: [ExtraController],
      });
    });
  });

  describe('when no uri is provided', () => {
    it('starts an in-memory MongoDB and uses its uri', async () => {
      const mongoServerMock = {
        getUri: jest.fn().mockReturnValue('mongodb://127.0.0.1:12345/test'),
        stop: jest.fn().mockResolvedValue(true),
      };
      (MongoMemoryServer.create as jest.Mock).mockResolvedValue(mongoServerMock);

      const result = await createDynamicApiTestingApp();

      expect(MongoMemoryServer.create).toHaveBeenCalled();
      expect(DynamicApiModule.forRoot).toHaveBeenCalledWith('mongodb://127.0.0.1:12345/test', {});
      expect(result.uri).toBe('mongodb://127.0.0.1:12345/test');
    });

    it('stops the in-memory server in addition to the app on close()', async () => {
      const mongoServerMock = {
        getUri: jest.fn().mockReturnValue('mongodb://127.0.0.1:12345/test'),
        stop: jest.fn().mockResolvedValue(true),
      };
      (MongoMemoryServer.create as jest.Mock).mockResolvedValue(mongoServerMock);

      const result = await createDynamicApiTestingApp();
      await result.close();

      expect(appMock.close).toHaveBeenCalled();
      expect(mongoServerMock.stop).toHaveBeenCalled();
    });
  });
});
