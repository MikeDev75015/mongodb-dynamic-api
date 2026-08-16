/** Shape of the MongoDB driver error thrown when a session/transaction isn't supported by the deployment. */
interface MongoTransactionsUnsupportedError extends Error {
  code?: number;
}

/**
 * True when `error` is MongoDB's "transactions require a replica set (or mongos)" failure —
 * thrown as soon as a session-scoped operation runs against a standalone `mongod` instance.
 * Code 20 (`IllegalOperation`) is the driver's own code for this; the message check is a
 * belt-and-suspenders fallback across server/driver versions that may not set `code`.
 */
function isTransactionsUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const { code } = error as MongoTransactionsUnsupportedError;

  return code === 20 || /replica set member or mongos/i.test(error.message);
}

export { isTransactionsUnsupportedError };
