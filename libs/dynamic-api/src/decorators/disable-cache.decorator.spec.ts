import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as NestJsCommon from '@nestjs/common';
import { DISABLE_CACHE_KEY, DisableCache } from './disable-cache.decorator';

vi.mock('@nestjs/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nestjs/common')>()),
  SetMetadata: vi.fn(() => () => {}),
}));

describe('DisableCache', () => {
  let spySetMetadata: Mock;

  beforeEach(() => {
    spySetMetadata = vi.spyOn(NestJsCommon, 'SetMetadata');
  });

  it('should call SetMetadata with DISABLE_CACHE_KEY and true', () => {
    DisableCache();

    expect(spySetMetadata).toHaveBeenCalledWith(DISABLE_CACHE_KEY, true);
  });
});

