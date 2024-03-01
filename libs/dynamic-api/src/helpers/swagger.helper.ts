import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import versionFile from '../version.json';

interface DynamicAPISwaggerOptions {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  swaggerConfig?: Omit<OpenAPIObject, "paths">;
  swaggerOptions?: SwaggerDocumentOptions;
}

function enableDynamicAPISwagger(
  app: INestApplication,
  options?: DynamicAPISwaggerOptions
) {
  const {
    title = 'MongoDB Dynamic API',
    description = 'Auto generated CRUD for MongoDB',
    version = versionFile?.version,
    path = '/api',
    swaggerOptions,
    swaggerConfig,
  } = options ?? {};

  const defaultConfig = new DocumentBuilder()
  .setTitle(title)
  .setDescription(description)
  .setVersion(version)
  .build();

  const document = SwaggerModule.createDocument(app, { ...defaultConfig, ...swaggerConfig }, swaggerOptions);

  SwaggerModule.setup(
    path,
    app,
    document,
  );
}

export { enableDynamicAPISwagger };
