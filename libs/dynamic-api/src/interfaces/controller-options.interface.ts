import { ValidationPipeOptions } from '@nestjs/common';

interface ControllerOptions {
  path: string;
  apiTag?: string;
  version?: string;
  validationPipeOptions?: ValidationPipeOptions;
}

export { ControllerOptions };
