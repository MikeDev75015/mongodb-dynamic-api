import * as NestJsCommon from '@nestjs/common';
import { DISABLE_CACHE_KEY, DisableCache } from './disable-cache.decorator';

jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn(() => () => {}),
}));

describe('DisableCache', () => {
  let spySetMetadata: jest.SpyInstance;

  beforeEach(() => {
    spySetMetadata = jest.spyOn(NestJsCommon, 'SetMetadata');
  });

  it('should call SetMetadata with DISABLE_CACHE_KEY and true', () => {
    DisableCache();

    expect(spySetMetadata).toHaveBeenCalledWith(DISABLE_CACHE_KEY, true);
  });
});

