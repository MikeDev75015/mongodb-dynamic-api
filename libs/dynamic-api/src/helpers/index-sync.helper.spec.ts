import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { MongoDBDynamicApiLogger } from '../logger';
import { enableDynamicAPIIndexSync } from './index-sync.helper';

vi.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: vi.fn().mockReturnValue('dynamic-api-connection') } },
}));

describe('enableDynamicAPIIndexSync', () => {
  let loggerErrorSpy: Mock;
  let syncIndexesA: Mock;
  let syncIndexesB: Mock;
  let app: INestApplication;

  const buildApp = (models: Record<string, unknown>): INestApplication => ({
    get: vi.fn().mockReturnValue({ models }),
  } as unknown as INestApplication);

  beforeEach(() => {
    vi.clearAllMocks();
    loggerErrorSpy = vi.spyOn(MongoDBDynamicApiLogger.prototype, 'error').mockImplementation(() => undefined);
    syncIndexesA = vi.fn().mockResolvedValue(undefined);
    syncIndexesB = vi.fn().mockResolvedValue(undefined);
    app = buildApp({
      UserA: { syncIndexes: syncIndexesA, collection: { collectionName: 'usera' } },
      UserB: { syncIndexes: syncIndexesB, collection: { collectionName: 'userb' } },
    });
  });

  it('should call syncIndexes on every model registered on the connection', async () => {
    await enableDynamicAPIIndexSync(app);

    expect(syncIndexesA).toHaveBeenCalled();
    expect(syncIndexesB).toHaveBeenCalled();
  });

  it('should rethrow a non-duplicate-key error unchanged, without logging', async () => {
    const genericError = new Error('connection lost');
    syncIndexesA.mockRejectedValueOnce(genericError);

    await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(genericError);
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should log and rethrow an actionable message for a missing-field duplicate-key error', async () => {
    const dupError = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: null },
    });
    syncIndexesA.mockRejectedValueOnce(dupError);

    await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
      /partialFilterExpression: \{ email: \{ \$exists: true \} \}/,
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"usera" (field "email")'));
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('legacy documents'));
  });

  it('should log and rethrow without the $exists suggestion for a genuine duplicate value', async () => {
    const dupError = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'already-taken@test.co' },
    });
    syncIndexesA.mockRejectedValueOnce(dupError);

    await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
      'existing documents already violate the uniqueness constraint. Original error: E11000 duplicate key error',
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.not.stringContaining('partialFilterExpression'));
  });

  it('should fall back to the model name and omit the field when keyPattern is missing', async () => {
    const dupError = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    syncIndexesA.mockRejectedValueOnce(dupError);
    app = buildApp({ UserA: { syncIndexes: syncIndexesA, collection: undefined } });

    await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
      '[DynamicAPI] enableDynamicAPIIndexSync: failed to build a unique index on "UserA" — '
      + 'existing documents already violate the uniqueness constraint. '
      + 'Original error: E11000 duplicate key error',
    );
  });

  it('should log but not throw, and continue syncing remaining models, when throwOnError is false', async () => {
    const dupError = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: null },
    });
    syncIndexesA.mockRejectedValueOnce(dupError);

    await expect(enableDynamicAPIIndexSync(app, { throwOnError: false })).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(syncIndexesB).toHaveBeenCalled();
  });
});
