import { Error as MongooseError } from 'mongoose';

/**
 * True when `error` is a Mongoose `CastError` — a value that couldn't be cast to the type a
 * queried path expects (e.g. a malformed id matched against an `_id`/`ObjectId` field). Used by
 * `IsUnique`/`EntityExists`, whose decorated value comes straight from client input: without this
 * check, a malformed id turns into an uncaught `CastError` inside their async `validate()`, which
 * rejects class-validator's whole `validate()` call instead of a clean validation failure — a raw
 * 500 instead of a 400.
 *
 * Deliberately narrow: any other error (e.g. a real connection failure) is not a "bad input" and
 * must keep propagating — only a cast failure is a safe, unambiguous signal about the value itself.
 *
 * @internal Not part of the public API.
 */
function isMongooseCastError(error: unknown): boolean {
  return error instanceof MongooseError.CastError;
}

export { isMongooseCastError };
