import { describe, expect, it } from 'vitest';
import { isTransactionsUnsupportedError } from './mongo-transaction.helper';

describe('isTransactionsUnsupportedError', () => {
  it('should return false for a non-Error value', () => {
    expect(isTransactionsUnsupportedError('not an error')).toBe(false);
    expect(isTransactionsUnsupportedError(undefined)).toBe(false);
    expect(isTransactionsUnsupportedError(null)).toBe(false);
  });

  it('should return false for an unrelated Error', () => {
    expect(isTransactionsUnsupportedError(new Error('some other failure'))).toBe(false);
  });

  it('should return true when code is 20 (IllegalOperation)', () => {
    const error = Object.assign(new Error('some message'), { code: 20 });

    expect(isTransactionsUnsupportedError(error)).toBe(true);
  });

  it('should return true when the message mentions "replica set member or mongos"', () => {
    const error = new Error('Transaction numbers are only allowed on a replica set member or mongos');

    expect(isTransactionsUnsupportedError(error)).toBe(true);
  });

  it('should be case-insensitive on the message check', () => {
    const error = new Error('REPLICA SET MEMBER OR MONGOS required');

    expect(isTransactionsUnsupportedError(error)).toBe(true);
  });
});
