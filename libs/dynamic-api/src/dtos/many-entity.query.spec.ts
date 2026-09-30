import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ManyEntityQuery } from './many-entity.query';

describe('ManyEntityQuery', () => {
  it.each([
    ['a single id (?ids=a)', { ids: 'a' }, ['a']],
    ['repeated ids (?ids=a&ids=b)', { ids: ['a', 'b'] }, ['a', 'b']],
  ])('should accept %s', async (_, query, expected) => {
    const instance = plainToInstance(ManyEntityQuery, query);

    expect(instance.ids).toEqual(expected);
    await expect(validate(instance)).resolves.toHaveLength(0);
  });

  it('should reject a query without ids', async () => {
    const errors = await validate(plainToInstance(ManyEntityQuery, {}));

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('arrayMinSize');
  });
});
