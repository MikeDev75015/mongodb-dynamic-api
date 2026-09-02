import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ValidationPipeOptions } from '@nestjs/common';
import * as NestJsCommon from '@nestjs/common';
import { ValidatorPipe } from './validator-pipe.decorator';

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    UsePipes: vi.fn(() => () => {}),
    ValidationPipe: vi.fn(function ValidationPipe() { return () => {}; }),
  };
});

describe('ValidatorPipe decorator', () => {
  let spyUsePipes: Mock;
  let spyValidationPipe: Mock;

  const validationPipeOptions: ValidationPipeOptions = {
    transform: true,
  };

  beforeEach(() => {
    spyUsePipes = vi.spyOn(NestJsCommon, 'UsePipes');
    spyValidationPipe = vi.spyOn(NestJsCommon, 'ValidationPipe');
  });

  it('should not call UsePipes', () => {
    ValidatorPipe();

    expect(spyUsePipes).not.toHaveBeenCalled();
    expect(spyValidationPipe).not.toHaveBeenCalled();
  });

  it('should call UsePipes with ValidationPipe with options', () => {
    ValidatorPipe(validationPipeOptions);

    expect(spyUsePipes).toHaveBeenCalledWith(expect.any(Function));
    expect(spyValidationPipe).toHaveBeenCalledWith(validationPipeOptions);
  });
});
