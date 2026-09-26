import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ValidationPipeOptions } from '@nestjs/common';
import * as NestJsCommon from '@nestjs/common';
import { BODY_VALIDATION_DEFAULTS, DynamicApiValidationPipe, IMPLICIT_ROUTE_VALIDATION_OPTIONS } from '../pipes/dynamic-api-validation.pipe';
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

  it('should use a plain ValidationPipe for the implicit route options (no strict body defaults)', () => {
    ValidatorPipe(IMPLICIT_ROUTE_VALIDATION_OPTIONS);

    expect(spyValidationPipe).toHaveBeenCalledTimes(1);
    expect(spyValidationPipe).toHaveBeenCalledWith(IMPLICIT_ROUTE_VALIDATION_OPTIONS);
  });

  it('should call UsePipes with ValidationPipe with options', () => {
    ValidatorPipe(validationPipeOptions);

    expect(spyUsePipes).toHaveBeenCalledWith(expect.any(DynamicApiValidationPipe));
    // strict pipe for bodies, pass-through pipe for queries and params
    expect(spyValidationPipe).toHaveBeenCalledWith({ ...BODY_VALIDATION_DEFAULTS, ...validationPipeOptions });
    expect(spyValidationPipe).toHaveBeenCalledWith(validationPipeOptions);
  });
});
