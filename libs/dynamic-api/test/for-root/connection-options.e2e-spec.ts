import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { initModule } from '../shared';

/**
 * E2E coverage for `forRoot(uri, { connectionOptions })` — Mongoose/driver connection options
 * (wire compression, pool size, timeouts, ...) used to be reachable only by rewriting the URI.
 * Asserted on the real MongoClient behind the module's connection, not on a mock.
 */
describe('DynamicApiModule forRoot - connectionOptions (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  const getClientOptions = async (forRootOptions: Parameters<typeof initModule>[0]) => {
    const app = await initModule(forRootOptions);
    const connection = app.get<Connection>(getConnectionToken(DynamicApiModule.state.get('connectionName')));

    return connection.getClient().options;
  };

  it('should forward connectionOptions to the MongoDB connection', async () => {
    const options = await getClientOptions({
      connectionOptions: { compressors: ['zlib'], maxPoolSize: 7, serverSelectionTimeoutMS: 4321 },
    });

    expect(options.compressors).toStrictEqual(['zlib']);
    expect(options.maxPoolSize).toBe(7);
    expect(options.serverSelectionTimeoutMS).toBe(4321);
  });

  it('should keep the driver defaults when connectionOptions is omitted', async () => {
    const options = await getClientOptions({});

    expect(options.compressors).not.toContain('zlib');
    expect(options.maxPoolSize).toBe(100);
  });
});
