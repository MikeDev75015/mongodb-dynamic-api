import { identifiersMatch, resolveIdentifierField } from './predicate-identifier.helper';

describe('resolveIdentifierField', () => {
  it('reads a single field name', () => {
    expect(resolveIdentifierField({ id: 'u1' }, 'id')).toBe('u1');
  });

  it('returns undefined when the single field is undefined', () => {
    expect(resolveIdentifierField<{ id?: string }>({}, 'id')).toBeUndefined();
  });

  it('returns the first defined, non-null field in an array of fallback fields', () => {
    expect(resolveIdentifierField({ id: undefined, sub: 's1' }, ['id', 'sub'])).toBe('s1');
  });

  it('skips a null field and falls through to the next one', () => {
    expect(resolveIdentifierField({ id: null, sub: 's1' }, ['id', 'sub'])).toBe('s1');
  });

  it('prefers the first field over later ones when both are defined', () => {
    expect(resolveIdentifierField({ id: 'u1', sub: 's1' }, ['id', 'sub'])).toBe('u1');
  });

  it('returns undefined when every fallback field is undefined or null', () => {
    expect(resolveIdentifierField({ id: undefined, sub: null }, ['id', 'sub'])).toBeUndefined();
  });
});

describe('identifiersMatch', () => {
  it('returns true for strictly equal values', () => {
    expect(identifiersMatch('u1', 'u1')).toBe(true);
  });

  it('returns false for different values', () => {
    expect(identifiersMatch('u1', 'u2')).toBe(false);
  });

  it('returns true when values are equal only once string-coerced (e.g. ObjectId vs string)', () => {
    const objectIdLike = { toString: () => 'u1' };

    expect(identifiersMatch(objectIdLike, 'u1')).toBe(true);
  });

  it('returns false when either value is null or undefined', () => {
    expect(identifiersMatch(null, 'u1')).toBe(false);
    expect(identifiersMatch('u1', undefined)).toBe(false);
    expect(identifiersMatch(null, undefined)).toBe(false);
  });
});
