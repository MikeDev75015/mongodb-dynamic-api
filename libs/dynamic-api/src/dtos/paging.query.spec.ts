import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PagingQuery } from './paging.query';

describe('PagingQuery', () => {
  it.each([
    ['both fields omitted', {}, 0],
    ['valid page and pageSize', { page: '2', pageSize: '10' }, 0],
    ['non-integer page', { page: '1.5' }, 1],
    ['page below 1', { page: '0' }, 1],
    ['non-integer pageSize', { pageSize: 'abc' }, 1],
    ['pageSize below 1', { pageSize: '0' }, 1],
  ])('%s should have %i validation error(s)', async (_label, input, expectedErrors) => {
    const dto = plainToInstance(PagingQuery, input);
    const errors = await validate(dto);
    expect(errors.length).toBe(expectedErrors);
  });

  it('coerces string query values into numbers via plainToInstance', () => {
    const dto = plainToInstance(PagingQuery, { page: '3', pageSize: '15' });

    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(15);
    expect(typeof dto.page).toBe('number');
    expect(typeof dto.pageSize).toBe('number');
  });
});
