import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'node:fs';
import { DynamicAPISwaggerExtraConfig, DynamicAPISwaggerOptions } from '../interfaces';
import jsonFile from '../version.json';

function buildExtraConfig(
  config: DocumentBuilder,
  swaggerConfig: DynamicAPISwaggerExtraConfig,
): void {
  Object.keys(swaggerConfig).forEach((key) => {
    const value = swaggerConfig[key];

    switch (key) {
      case 'termsOfService':
        config.setTermsOfService(value);
        break;

      case 'contact':
        config.setContact(value.name, value.url, value.email);
        break;

      case 'license':
        config.setLicense(value.name, value.url);
        break;

      case 'servers':
        value.forEach((server: any) => {
          config.addServer(server.url, server.description, server.variables);
        });
        break;

      case 'externalDocs':
        config.setExternalDoc(value.description, value.url);
        break;

      case 'basePath':
        config.setBasePath(value);
        break;

      case 'tags':
        value.forEach((tag: any) => {
          config.addTag(tag.name, tag.description, tag.externalDocs);
        });
        break;

      case 'extensions':
        Object.keys(value).forEach((extensionKey) => {
          config.addExtension(extensionKey, value[extensionKey]);
        });
        break;

      case 'security':
        Object.keys(value).forEach((securityKey) => {
          config.addSecurity(securityKey, value[securityKey]);
        });
        break;

      case 'globalParameters':
        config.addGlobalParameters(...value);
        break;

      case 'securityRequirements':
        Object.keys(value).forEach((securityKey) => {
          config.addSecurityRequirements(securityKey, value[securityKey]);
        });
        break;

      case 'bearerAuth':
        if (typeof value === 'boolean' && value) {
          config.addBearerAuth();
        } else {
          config.addBearerAuth(value);
        }
        break;

      case 'oAuth2':
        if (typeof value === 'boolean' && value) {
          config.addOAuth2();
        } else {
          config.addOAuth2(value);
        }
        break;

      case 'apiKey':
        if (typeof value === 'boolean' && value) {
          config.addApiKey();
        } else {
          config.addApiKey(value);
        }
        break;

      case 'basicAuth':
        if (typeof value === 'boolean' && value) {
          config.addBasicAuth();
        } else {
          config.addBasicAuth(value);
        }
        break;

      case 'cookieAuth':
        if (typeof value === 'boolean' && value) {
          config.addCookieAuth();
        } else {
          config.addCookieAuth(value.cookieName, value.options, value.securityName);
        }
        break;

      default:
        break;
    }
  });
}

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
