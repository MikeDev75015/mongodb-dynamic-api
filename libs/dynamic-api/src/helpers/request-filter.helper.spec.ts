import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { assertEveryTargetFound, assertNoMongoOperators, buildAbilityPredicateFilter } from './request-filter.helper';

describe('request-filter.helper', () => {
  describe('assertNoMongoOperators', () => {
    it.each([
      ['undefined', undefined],
      ['a string', 'text'],
      ['a flat object', { name: 'toto', age: 3 }],
      ['nested objects and arrays', { tags: ['a', { label: 'b' }], meta: { deep: { ok: true } } }],
    ])('should accept %s', (_, value) => {
      expect(() => assertNoMongoOperators(value)).not.toThrow();
    });

    it.each([
      ['a top-level operator', { $where: 'sleep(1000)' }],
      ['a nested operator', { owner: { $ne: null } }],
      ['an operator inside an array', { ids: [{ $gt: '' }] }],
      ['an operator inside a top-level array', [{ name: { $regex: '.*' } }]],
    ])('should reject %s', (_, value) => {
      expect(() => assertNoMongoOperators(value)).toThrow(BadRequestException);
    });
  });

  describe('buildAbilityPredicateFilter', () => {
    it.each([
      ['undefined', undefined, {}],
      ['a non-object value', 'text', {}],
      ['an array', ['a'], {}],
      ['a plain filter', { name: 'toto' }, { name: 'toto' }],
      ['an ids array', { ids: ['a', 'b'] }, { _id: { $in: ['a', 'b'] } }],
      ['a single id', { ids: 'a' }, { _id: { $in: ['a'] } }],
      ['ids with update fields', { ids: ['a'], name: 'renamed' }, { _id: { $in: ['a'] } }],
    ])('should build the filter from %s', (_, input, expected) => {
      expect(buildAbilityPredicateFilter(input)).toStrictEqual(expected);
    });

    it('should reject an input carrying a MongoDB operator key', () => {
      expect(() => buildAbilityPredicateFilter({ ids: { $ne: null } })).toThrow(BadRequestException);
    });
  });

  describe('assertEveryTargetFound', () => {
    it.each([
      ['no ids in the input', { name: 'toto' }, 0],
      ['a non-object input', undefined, 0],
      ['every id found', { ids: ['a', 'b'] }, 2],
      ['duplicated ids found once', { ids: ['a', 'a'] }, 1],
      ['a single id found', { ids: 'a' }, 1],
    ])('should pass with %s', (_, input, foundCount) => {
      expect(() => assertEveryTargetFound(input, foundCount)).not.toThrow();
    });

    it('should throw a 404 when some ids were not found', () => {
      expect(() => assertEveryTargetFound({ ids: ['a', 'b'] }, 1)).toThrow(NotFoundException);
    });
  });
});
