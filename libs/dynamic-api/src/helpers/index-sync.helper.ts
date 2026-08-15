import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoDBDynamicApiLogger } from '../logger';

/**
 * Options for {@link enableDynamicAPIIndexSync}.
 */
interface DynamicAPIIndexSyncOptions {
  /**
   * When true (default), a duplicate-key error while syncing a unique index is logged with an
   * actionable message, then rethrown — booting fails loudly instead of starting up with a
   * stale/partial index. Set to `false` to log the error and keep booting regardless.
   */
  throwOnError?: boolean;
}

/** Shape of the MongoDB driver's duplicate-key (`E11000`) error, as thrown by `Model.syncIndexes()`. */
interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return !!error && typeof error === 'object' && (error as MongoDuplicateKeyError).code === 11000;
}

function buildActionableMessage(collectionName: string, error: MongoDuplicateKeyError): string {
  const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : undefined;
  const clashValue = field ? error.keyValue?.[field] : undefined;
  const isMissingFieldClash = field !== undefined && (clashValue === null || clashValue === undefined);

  const base = `[DynamicAPI] enableDynamicAPIIndexSync: failed to build a unique index on `
    + `"${collectionName}"${field ? ` (field "${field}")` : ''} — existing documents already violate `
    + `the uniqueness constraint.`;

  if (!isMissingFieldClash) {
    return `${base} Original error: ${error.message}`;
  }

  return `${base} This is the classic case: legacy documents that predate the field don't have it `
    + `(so it's absent/null on all of them), and MongoDB treats every one of those nulls as a `
    + `duplicate of the others. Fix: scope the unique index to documents where the field actually `
    + `exists — e.g. \`@Prop({ unique: true, partialFilterExpression: { ${field}: { $exists: true } } })\` `
    + `— then re-run the sync. Original error: ${error.message}`;
}

/**
 * Syncs Mongoose indexes for every model registered on the DynamicAPI connection
 * (`model.syncIndexes()` for each), and turns a duplicate-key (`E11000`) failure — the classic
 * "I added a unique index and now boot crashes with a raw Mongo stack" trap — into an actionable
 * message that names the offending collection/field and, for the common "legacy docs missing the
 * field" case, suggests the `partialFilterExpression: { field: { $exists: true } }` fix.
 *
 * Call this once during bootstrap, after `app.init()`/`NestFactory.create()` — same pattern as
 * `enableDynamicAPIValidation`/`enableDynamicAPISwagger`.
 *
 * @param {INestApplication} app The Nest application instance.
 * @param {DynamicAPIIndexSyncOptions} options Setup options (`throwOnError`, default `true`).
 *
 * @example
 * ```typescript
 * const app = await NestFactory.create(AppModule);
 * await enableDynamicAPIIndexSync(app);
 * await app.listen(3000);
 * ```
 */
async function enableDynamicAPIIndexSync(
  app: INestApplication,
  options: DynamicAPIIndexSyncOptions = {},
): Promise<void> {
  const { throwOnError = true } = options;
  const logger = new MongoDBDynamicApiLogger('enableDynamicAPIIndexSync');

  // Lazy-require to avoid a circular dependency at module load time
  // (dynamic-api.module.ts imports from './helpers', which includes this file).
  const { DynamicApiModule }: { DynamicApiModule: typeof import('../dynamic-api.module').DynamicApiModule } =
    require('../dynamic-api.module');
  const connectionName = DynamicApiModule.state.get<string>('connectionName');
  const connection = app.get<Connection>(getConnectionToken(connectionName));

  for (const [name, model] of Object.entries(connection.models)) {
    try {
      await model.syncIndexes();
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const message = buildActionableMessage(model.collection?.collectionName ?? name, error);
      logger.error(message);

      if (throwOnError) {
        throw new Error(message);
      }
    }
  }
}

export { enableDynamicAPIIndexSync, DynamicAPIIndexSyncOptions };
