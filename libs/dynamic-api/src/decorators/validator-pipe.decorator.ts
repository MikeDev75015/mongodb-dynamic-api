import { applyDecorators, UsePipes, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

/** @deprecated Internal API — will be removed from public exports in v5. */
function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  return validationPipeOptions ? applyDecorators(
    UsePipes(new ValidationPipe(validationPipeOptions)),
  ) : (_: unknown) => undefined;
}

export { ValidatorPipe };
