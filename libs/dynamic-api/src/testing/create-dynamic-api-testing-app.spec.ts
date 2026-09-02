import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DynamicApiModule } from '../dynamic-api.module';
import { createDynamicApiTestingApp } from './create-dynamic-api-testing-app';

vi.mock('@nestjs/testing', () => ({
  Test: { createTestingModule: vi.fn() },
}));

vi.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { forRoot: vi.fn() },
}));

vi.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: { create: vi.fn() },
}));

describe('createDynamicApiTestingApp', () => {
  let appMock: INestApplication;
  let moduleRefMock: { createNestApplication: Mock };
  let forRootModule: object;

  beforeEach(() => {
    vi.clearAllMocks();
    appMock = { init: vi.fn(), close: vi.fn() } as unknown as INestApplication;
    moduleRefMock = { createNestApplication: vi.fn().mockReturnValue(appMock) };
    (Test.createTestingModule as Mock).mockReturnValue({
      compile: vi.fn().mockResolvedValue(moduleRefMock),
    });
    forRootModule = { module: 'FakeForRootModule' };
    (DynamicApiModule.forRoot as Mock).mockReturnValue(forRootModule);
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
        getUri: vi.fn().mockReturnValue('mongodb://127.0.0.1:12345/test'),
        stop: vi.fn().mockResolvedValue(true),
      };
      (MongoMemoryServer.create as Mock).mockResolvedValue(mongoServerMock);

      const result = await createDynamicApiTestingApp();

      expect(MongoMemoryServer.create).toHaveBeenCalled();
      expect(DynamicApiModule.forRoot).toHaveBeenCalledWith('mongodb://127.0.0.1:12345/test', {});
      expect(result.uri).toBe('mongodb://127.0.0.1:12345/test');
    });

    it('stops the in-memory server in addition to the app on close()', async () => {
      const mongoServerMock = {
        getUri: vi.fn().mockReturnValue('mongodb://127.0.0.1:12345/test'),
        stop: vi.fn().mockResolvedValue(true),
      };
      (MongoMemoryServer.create as Mock).mockResolvedValue(mongoServerMock);

      const result = await createDynamicApiTestingApp();
      await result.close();

      expect(appMock.close).toHaveBeenCalled();
      expect(mongoServerMock.stop).toHaveBeenCalled();
    });
  });
});
