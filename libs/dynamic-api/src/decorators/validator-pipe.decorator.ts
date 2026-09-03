import { applyDecorators, UsePipes, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

/** @internal Not part of the public API. */
function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  return validationPipeOptions ? applyDecorators(
    UsePipes(new ValidationPipe(validationPipeOptions)),
  ) : (_: unknown) => undefined;
}

export { ValidatorPipe };
