import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'node:fs';
import { DynamicAPISwaggerExtraConfig, DynamicAPISwaggerOptions } from '../interfaces';
import jsonFile from '../version.json';

type ExtraConfigHandler = (config: DocumentBuilder, value: any) => void;

const extraConfigHandlers: Record<string, ExtraConfigHandler> = {
  termsOfService: (config, value) => config.setTermsOfService(value),
  contact: (config, value) => config.setContact(value.name, value.url, value.email),
  license: (config, value) => config.setLicense(value.name, value.url),
  servers: (config, value) =>
    value.forEach((server: { url: string; description?: string; variables?: Record<string, { default: string; enum?: string[]; description?: string }> }) =>
      config.addServer(server.url, server.description, server.variables),
    ),
  externalDocs: (config, value) => config.setExternalDoc(value.description, value.url),
  basePath: (config, value) => config.setBasePath(value),
  tags: (config, value) =>
    value.forEach((tag: { name: string; description?: string; externalDocs?: { url: string; description?: string } }) =>
      config.addTag(tag.name, tag.description, tag.externalDocs),
    ),
  extensions: (config, value) =>
    Object.keys(value).forEach((extensionKey) => config.addExtension(extensionKey, value[extensionKey])),
  security: (config, value) =>
    Object.keys(value).forEach((securityKey) => config.addSecurity(securityKey, value[securityKey])),
  globalParameters: (config, value) => config.addGlobalParameters(...value),
  securityRequirements: (config, value) =>
    Object.keys(value).forEach((securityKey) => config.addSecurityRequirements(securityKey, value[securityKey])),
  bearerAuth: (config, value) =>
    typeof value === 'boolean' && value ? config.addBearerAuth() : config.addBearerAuth(value),
  oAuth2: (config, value) =>
    typeof value === 'boolean' && value ? config.addOAuth2() : config.addOAuth2(value),
  apiKey: (config, value) =>
    typeof value === 'boolean' && value ? config.addApiKey() : config.addApiKey(value),
  basicAuth: (config, value) =>
    typeof value === 'boolean' && value ? config.addBasicAuth() : config.addBasicAuth(value),
  cookieAuth: (config, value) =>
    typeof value === 'boolean' && value
      ? config.addCookieAuth()
      : config.addCookieAuth(value.cookieName, value.options, value.securityName),
};

function buildExtraConfig(
  config: DocumentBuilder,
  swaggerConfig: DynamicAPISwaggerExtraConfig,
): void {
  Object.keys(swaggerConfig).forEach((key) => {
    extraConfigHandlers[key]?.(config, swaggerConfig[key]);
  });
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function enableDynamicAPISwagger(
  app: INestApplication,
  options?: DynamicAPISwaggerOptions,
) {
  const versionFile = require('../version.json');
  const {
    title = 'MongoDB Dynamic API',
    description = 'Auto generated CRUD for MongoDB',
    version = (jsonFile ?? versionFile)?.version,
    path = '/dynamic-api',
    swaggerExtraConfig,
    swaggerDocumentOptions,
  } = options ?? {};

  const config = new DocumentBuilder()
  .setTitle(title)
  .setDescription(description)
  .setVersion(version);

  if (swaggerExtraConfig) {
    buildExtraConfig(config, swaggerExtraConfig);
  }

  const document = SwaggerModule.createDocument(app, config.build(), swaggerDocumentOptions);

  if (options?.jsonFilePath) {
    fs.writeFileSync(options?.jsonFilePath, JSON.stringify(document, null, 2));
  }

  SwaggerModule.setup(
    path,
    app,
    document,
  );
}

export { enableDynamicAPISwagger };
