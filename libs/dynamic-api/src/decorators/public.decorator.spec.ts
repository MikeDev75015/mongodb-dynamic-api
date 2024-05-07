import * as NestJsCommon from '@nestjs/common';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    SetMetadata: jest.fn(() => () => {}),
  };
});

describe('Public decorator', () => {
  let spySetMetadata: jest.SpyInstance;

  beforeEach(() => {
    spySetMetadata = jest.spyOn(NestJsCommon, 'SetMetadata');
  });

  it('should call SetMetadata with isPublic key and true', () => {
    Public();

    expect(spySetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });
});
