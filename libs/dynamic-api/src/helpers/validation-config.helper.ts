import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';


function enableDynamicAPIValidation(app: INestApplication, options: ValidationPipeOptions = {}) {
  app.useGlobalPipes(
    new ValidationPipe(options),
  );
}

export { enableDynamicAPIValidation };
