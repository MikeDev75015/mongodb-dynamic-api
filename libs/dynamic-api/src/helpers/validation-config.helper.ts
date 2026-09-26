import type { INestApplication, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiValidationPipe } from '../pipes/dynamic-api-validation.pipe';


function enableDynamicAPIValidation(app: INestApplication, options: ValidationPipeOptions = {}) {
  app.useGlobalPipes(
    new DynamicApiValidationPipe(options),
  );
}

export { enableDynamicAPIValidation };
