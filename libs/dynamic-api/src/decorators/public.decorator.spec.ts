import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as NestJsCommon from '@nestjs/common';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    SetMetadata: vi.fn(() => () => {}),
  };
});

describe('Public decorator', () => {
  let spySetMetadata: Mock;

  beforeEach(() => {
    spySetMetadata = vi.spyOn(NestJsCommon, 'SetMetadata');
  });

  it('should call SetMetadata with isPublic key and true', () => {
    Public();

    expect(spySetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });
});
