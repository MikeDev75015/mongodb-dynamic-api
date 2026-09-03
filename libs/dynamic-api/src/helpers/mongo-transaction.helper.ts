/** Shape of the MongoDB driver error thrown when a session/transaction isn't supported by the deployment. */
interface MongoTransactionsUnsupportedError extends Error {
  code?: number;
}

/**
 * True when `error` is MongoDB's "transactions require a replica set (or mongos)" failure —
 * thrown as soon as a session-scoped operation runs against a standalone `mongod` instance.
 * Code 20 (`IllegalOperation`) is the driver's own code for this; the message check is a
 * belt-and-suspenders fallback across server/driver versions that may not set `code`.
 *
 * Exported as a standalone, dependency-free predicate — MDA itself uses it internally
 * (`BaseService.deleteWithCascade`) to fall back to a non-transactional cascade delete when the
 * deployment doesn't support sessions, but the check is equally useful for any application code
 * that runs its own `session.withTransaction(...)` outside MDA's generated routes and wants the
 * same environment-aware fallback.
 *
 * @example
 * ```typescript
 * import { isTransactionsUnsupportedError } from 'mongodb-dynamic-api';
 *
 * try {
 *   await session.withTransaction(async () => { ... });
 * } catch (error) {
 *   if (!isTransactionsUnsupportedError(error)) {
 *     throw error;
 *   }
 *   // Standalone mongod — fall back to a plain, non-transactional write.
 *   await doWithoutTransaction();
 * }
 * ```
 */
function isTransactionsUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const { code } = error as MongoTransactionsUnsupportedError;

  return code === 20 || /replica set member or mongos/i.test(error.message);
}

export { isTransactionsUnsupportedError };
