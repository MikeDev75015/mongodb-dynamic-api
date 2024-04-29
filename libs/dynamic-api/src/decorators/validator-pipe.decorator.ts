import { applyDecorators, UsePipes, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

function ValidatorPipe(validationPipeOptions?: ValidationPipeOptions): ClassDecorator {
  return validationPipeOptions ? applyDecorators(
    UsePipes(new ValidationPipe(validationPipeOptions)),
  ) : (_: any) => undefined;
}

export { ValidatorPipe };
