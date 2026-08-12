import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';


/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function enableDynamicAPIValidation(app: INestApplication, options: ValidationPipeOptions = {}) {
  app.useGlobalPipes(
    new ValidationPipe(options),
  );
}

export { enableDynamicAPIValidation };
