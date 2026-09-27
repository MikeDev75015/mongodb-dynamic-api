import { applyDecorators, UsePipes, ValidationPipe } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiValidationPipe, IMPLICIT_ROUTE_VALIDATION_OPTIONS } from '../pipes/dynamic-api-validation.pipe';

/** @internal Not part of the public API. */
function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  if (!validationPipeOptions) {
    return (_: unknown) => undefined;
  }

  const pipe = validationPipeOptions === IMPLICIT_ROUTE_VALIDATION_OPTIONS
    ? new ValidationPipe(validationPipeOptions)
    : new DynamicApiValidationPipe(validationPipeOptions);

  return applyDecorators(UsePipes(pipe));
}

export { ValidatorPipe };
