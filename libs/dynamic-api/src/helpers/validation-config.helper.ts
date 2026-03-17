import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';


/** @deprecated Internal API — will be removed from public exports in v5. */
function enableDynamicAPIValidation(app: INestApplication, options: ValidationPipeOptions = {}) {
  app.useGlobalPipes(
    new ValidationPipe(options),
  );
}

export { enableDynamicAPIValidation };
