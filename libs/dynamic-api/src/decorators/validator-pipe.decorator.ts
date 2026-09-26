import { applyDecorators, UsePipes, ValidationPipe } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiValidationPipe, IMPLICIT_ROUTE_VALIDATION_OPTIONS } from '../pipes/dynamic-api-validation.pipe';

/** @internal Not part of the public API. */
function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  return validationPipeOptions ? applyDecorators(
    UsePipes(
      validationPipeOptions === IMPLICIT_ROUTE_VALIDATION_OPTIONS
        ? new ValidationPipe(validationPipeOptions)
        : new DynamicApiValidationPipe(validationPipeOptions),
    ),
  ) : (_: unknown) => undefined;
}

export { ValidatorPipe };
