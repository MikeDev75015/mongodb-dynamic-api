import { describe, expect, it } from 'vitest';
import { AbilityPredicate } from '../interfaces';
import { BaseEntity } from '../models';
import { allOf, anyOf, not } from './composition.predicate';

class TestEntity extends BaseEntity {}

const entity = new TestEntity();
const user = {};

const trueP: AbilityPredicate<TestEntity> = () => true;
const falseP: AbilityPredicate<TestEntity> = () => false;

describe('allOf', () => {
  it('should grant access unconditionally with zero predicates', () => {
    expect(allOf<TestEntity>()(entity, user)).toBe(true);
  });

  it('should return the single predicate result with one predicate', () => {
    expect(allOf<TestEntity>(trueP)(entity, user)).toBe(true);
    expect(allOf<TestEntity>(falseP)(entity, user)).toBe(false);
  });

  it('should grant access only when all predicates pass', () => {
    expect(allOf<TestEntity>(trueP, trueP)(entity, user)).toBe(true);
    expect(allOf<TestEntity>(trueP, falseP)(entity, user)).toBe(false);
  });
});

describe('anyOf', () => {
  it('should deny access unconditionally with zero predicates', () => {
    expect(anyOf<TestEntity>()(entity, user)).toBe(false);
  });

  it('should return the single predicate result with one predicate', () => {
    expect(anyOf<TestEntity>(trueP)(entity, user)).toBe(true);
    expect(anyOf<TestEntity>(falseP)(entity, user)).toBe(false);
  });

  it('should grant access when at least one predicate passes', () => {
    expect(anyOf<TestEntity>(falseP, trueP)(entity, user)).toBe(true);
    expect(anyOf<TestEntity>(falseP, falseP)(entity, user)).toBe(false);
  });
});

describe('not', () => {
  it('should invert a true predicate', () => {
    expect(not<TestEntity>(trueP)(entity, user)).toBe(false);
  });

  it('should invert a false predicate', () => {
    expect(not<TestEntity>(falseP)(entity, user)).toBe(true);
  });
});

describe('nested composition', () => {
  it('should support allOf(anyOf(...), not(...))', () => {
    const predicate = allOf<TestEntity>(anyOf(falseP, trueP), not(falseP));

    expect(predicate(entity, user)).toBe(true);
  });

  it('should short-circuit to false when the nested anyOf fails', () => {
    const predicate = allOf<TestEntity>(anyOf(falseP, falseP), not(falseP));

    expect(predicate(entity, user)).toBe(false);
  });
});
