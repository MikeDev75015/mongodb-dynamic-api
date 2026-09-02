import { describe, expect, it } from 'vitest';
import { parsePagingParams } from './paging-params.helper';

describe('parsePagingParams', () => {
  it('defaults to page 1 and pageSize 20 when both are missing', () => {
    expect(parsePagingParams({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('passes through valid values unchanged', () => {
    expect(parsePagingParams({ page: 3, pageSize: 15 })).toEqual({ page: 3, pageSize: 15 });
  });

  it('clamps page below 1 up to 1', () => {
    expect(parsePagingParams({ page: 0 })).toEqual({ page: 1, pageSize: 20 });
    expect(parsePagingParams({ page: -5 })).toEqual({ page: 1, pageSize: 20 });
  });

  it('clamps pageSize below 1 up to 1', () => {
    expect(parsePagingParams({ pageSize: 0 })).toEqual({ page: 1, pageSize: 1 });
    expect(parsePagingParams({ pageSize: -10 })).toEqual({ page: 1, pageSize: 1 });
  });

  it('clamps pageSize above the default maxPageSize (100) down to 100', () => {
    expect(parsePagingParams({ pageSize: 5000 })).toEqual({ page: 1, pageSize: 100 });
  });

  it('respects a custom maxPageSize option', () => {
    expect(parsePagingParams({ pageSize: 5000 }, { maxPageSize: 50 })).toEqual({ page: 1, pageSize: 50 });
  });

  it('respects a custom defaultPageSize option when pageSize is missing', () => {
    expect(parsePagingParams({}, { defaultPageSize: 25 })).toEqual({ page: 1, pageSize: 25 });
  });

  it('truncates a non-integer value instead of propagating a fraction', () => {
    expect(parsePagingParams({ page: 2.9, pageSize: 15.7 })).toEqual({ page: 2, pageSize: 15 });
  });

  it('falls back to the default instead of propagating NaN', () => {
    expect(parsePagingParams({ page: NaN, pageSize: NaN })).toEqual({ page: 1, pageSize: 20 });
  });
});
