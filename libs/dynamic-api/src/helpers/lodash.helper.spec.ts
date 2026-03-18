import { camelCase, cloneDeep, isEmpty, kebabCase, lowerCase, lowerFirst, pick, upperFirst } from './lodash.helper';

describe('lodash.helper', () => {
  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    it('should return true for numbers', () => {
      expect(isEmpty(0)).toBe(true);
      expect(isEmpty(1)).toBe(true);
    });

    it('should return true for booleans', () => {
      expect(isEmpty(true)).toBe(true);
      expect(isEmpty(false)).toBe(true);
    });

    it('should return true for empty Map', () => {
      expect(isEmpty(new Map())).toBe(true);
    });

    it('should return false for non-empty Map', () => {
      expect(isEmpty(new Map([['a', 1]]))).toBe(false);
    });

    it('should return true for empty Set', () => {
      expect(isEmpty(new Set())).toBe(true);
    });

    it('should return false for non-empty Set', () => {
      expect(isEmpty(new Set([1]))).toBe(false);
    });
  });

  describe('cloneDeep', () => {
    it('should deep clone an object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const clone = cloneDeep(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      expect(clone.b).not.toBe(obj.b);
    });

    it('should deep clone an array', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const clone = cloneDeep(arr);

      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[1]).not.toBe(arr[1]);
    });

    it('should deep clone primitives', () => {
      expect(cloneDeep('hello')).toBe('hello');
      expect(cloneDeep(42)).toBe(42);
      expect(cloneDeep(null)).toBe(null);
    });
  });

  describe('pick', () => {
    it('should pick specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should ignore keys that do not exist', () => {
      const obj = { a: 1, b: 2 };
      expect(pick(obj, ['a', 'z'] as any)).toEqual({ a: 1 });
    });

    it('should return empty object for empty keys', () => {
      const obj = { a: 1, b: 2 };
      expect(pick(obj, [])).toEqual({});
    });
  });

  describe('camelCase', () => {
    it('should convert hyphenated string', () => {
      expect(camelCase('foo-bar')).toBe('fooBar');
    });

    it('should convert underscored string', () => {
      expect(camelCase('foo_bar')).toBe('fooBar');
    });

    it('should convert spaced string', () => {
      expect(camelCase('Foo Bar')).toBe('fooBar');
    });

    it('should convert PascalCase string', () => {
      expect(camelCase('FooBar')).toBe('fooBar');
    });

    it('should handle empty string', () => {
      expect(camelCase('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(camelCase(undefined)).toBe('');
    });

    it('should handle complex mixed string', () => {
      expect(camelCase('--FOO-BAR--')).toBe('fooBar');
    });

    it('should handle string with numbers', () => {
      expect(camelCase('foo2bar')).toBe('foo2bar');
    });
  });

  describe('upperFirst', () => {
    it('should capitalize first character', () => {
      expect(upperFirst('hello')).toBe('Hello');
    });

    it('should keep the rest unchanged', () => {
      expect(upperFirst('hELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(upperFirst('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(upperFirst(undefined)).toBe('');
    });

    it('should handle single character', () => {
      expect(upperFirst('a')).toBe('A');
    });
  });

  describe('lowerFirst', () => {
    it('should lowercase first character', () => {
      expect(lowerFirst('Hello')).toBe('hello');
    });

    it('should keep the rest unchanged', () => {
      expect(lowerFirst('HELLO')).toBe('hELLO');
    });

    it('should handle empty string', () => {
      expect(lowerFirst('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(lowerFirst(undefined)).toBe('');
    });

    it('should handle single character', () => {
      expect(lowerFirst('A')).toBe('a');
    });
  });

  describe('kebabCase', () => {
    it('should convert camelCase', () => {
      expect(kebabCase('fooBar')).toBe('foo-bar');
    });

    it('should convert PascalCase', () => {
      expect(kebabCase('FooBar')).toBe('foo-bar');
    });

    it('should convert spaced string', () => {
      expect(kebabCase('Foo Bar')).toBe('foo-bar');
    });

    it('should convert underscored string', () => {
      expect(kebabCase('foo_bar')).toBe('foo-bar');
    });

    it('should handle empty string', () => {
      expect(kebabCase('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(kebabCase(undefined)).toBe('');
    });

    it('should handle slash-separated route-like string', () => {
      expect(kebabCase('CreateOne/UserProfile')).toBe('create-one-user-profile');
    });
  });

  describe('lowerCase', () => {
    it('should convert PascalCase', () => {
      expect(lowerCase('FooBar')).toBe('foo bar');
    });

    it('should convert camelCase', () => {
      expect(lowerCase('fooBar')).toBe('foo bar');
    });

    it('should convert kebab-case', () => {
      expect(lowerCase('foo-bar')).toBe('foo bar');
    });

    it('should convert snake_case', () => {
      expect(lowerCase('foo_bar')).toBe('foo bar');
    });

    it('should handle empty string', () => {
      expect(lowerCase('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(lowerCase(undefined)).toBe('');
    });
  });
});




