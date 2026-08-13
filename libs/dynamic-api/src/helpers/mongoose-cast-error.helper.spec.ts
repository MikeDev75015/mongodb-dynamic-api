import { Error as MongooseError } from 'mongoose';
import { isMongooseCastError } from './mongoose-cast-error.helper';

describe('isMongooseCastError', () => {
  it('returns true for a Mongoose CastError', () => {
    expect(isMongooseCastError(new MongooseError.CastError('ObjectId', 'not-an-id', '_id'))).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isMongooseCastError(new Error('connection lost'))).toBe(false);
  });

  it('returns false for a non-error value', () => {
    expect(isMongooseCastError('not-an-error')).toBe(false);
  });
});
