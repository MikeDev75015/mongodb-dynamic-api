import { ValidationPipeOptions } from '@nestjs/common';
import * as NestJsCommon from '@nestjs/common';
import { ValidatorPipe } from './validator-pipe.decorator';

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    UsePipes: jest.fn(() => () => {}),
    ValidationPipe: jest.fn(() => () => {}),
  };
});

describe('ValidatorPipe decorator', () => {
  let spyUsePipes: jest.SpyInstance;
  let spyValidationPipe: jest.SpyInstance;

  const validationPipeOptions: ValidationPipeOptions = {
    transform: true,
  };

  beforeEach(() => {
    spyUsePipes = jest.spyOn(NestJsCommon, 'UsePipes');
    spyValidationPipe = jest.spyOn(NestJsCommon, 'ValidationPipe');
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
