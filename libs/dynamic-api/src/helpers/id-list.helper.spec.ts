import { describe, expect, it } from 'vitest';
import { toIdList } from './id-list.helper';

describe('toIdList', () => {
  it.each([
    ['undefined', undefined, []],
    ['null', null, []],
    ['an empty string', '', []],
    ['a single id', 'a', ['a']],
    ['an array of ids', ['a', 'b'], ['a', 'b']],
    ['an empty array', [], []],
    ['a non-string id', 42, ['42']],
  ])('should normalize %s', (_, input, expected) => {
    expect(toIdList(input)).toEqual(expected);
  });
});
