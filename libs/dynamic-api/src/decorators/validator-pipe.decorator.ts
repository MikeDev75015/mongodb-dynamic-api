import { applyDecorators, UsePipes, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  return validationPipeOptions ? applyDecorators(
    UsePipes(new ValidationPipe(validationPipeOptions)),
  ) : (_: unknown) => undefined;
}

export { ValidatorPipe };
