import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import {
  ExternalDocumentationObject,
  ParameterObject,
  SecuritySchemeObject,
  ServerVariableObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import versionFile from '../version.json';

type DynamicAPISwaggerExtraConfig = {
  termsOfService?: string;
  contact?: {
    name: string;
    url: string;
    email: string;
  };
  license?: {
    name: string;
    url: string;
  };
  servers?: {
    url: string;
    description?: string;
    variables?: Record<string, ServerVariableObject>;
  }[];
  externalDocs?: {
    description: string;
    url: string;
  };
  basePath?: string;
  tags?: {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
  }[];
  extensions?: {
    [key: string]: any;
  };
  security?: {
    [key: string]: SecuritySchemeObject;
  };
  globalParameters?: ParameterObject[];
  securityRequirements?: {
    [key: string]: string[];
  };
  bearerAuth?: SecuritySchemeObject;
  oAuth2?: SecuritySchemeObject;
  apiKey?: SecuritySchemeObject;
  basicAuth?: SecuritySchemeObject;
  cookieAuth?: {
    cookieName: string;
    options: SecuritySchemeObject;
    securityName: string;
  };
};

type DynamicAPISwaggerOptions = {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  swaggerConfig?: DynamicAPISwaggerExtraConfig;
  swaggerOptions?: SwaggerDocumentOptions;
}

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
        value.forEach((server) => {
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
        value.forEach((tag) => {
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
        config.addBearerAuth(value);
        break;

      case 'oAuth2':
        config.addOAuth2(value);
        break;

      case 'apiKey':
        config.addApiKey(value);
        break;

      case 'basicAuth':
        config.addBasicAuth(value);
        break;

      case 'cookieAuth':
        config.addCookieAuth(value.cookieName, value.options, value.securityName);
        break;

      default:
        break;
    }
  });
}

function enableDynamicAPISwagger(
  app: INestApplication,
  options: DynamicAPISwaggerOptions = {},
) {
  const {
    title = 'MongoDB Dynamic API',
    description = 'Auto generated CRUD for MongoDB',
    version = versionFile?.version?.split('-beta')[0],
    path = '/openapi',
    swaggerConfig,
    swaggerOptions,
  } = options ?? {};

  const config = new DocumentBuilder()
  .setTitle(title)
  .setDescription(description)
  .setVersion(version);

  buildExtraConfig(config, swaggerConfig ?? {});

  const document = SwaggerModule.createDocument(app, config.build(), swaggerOptions);

  SwaggerModule.setup(
    path,
    app,
    document,
  );
}

function enableDynamicAPIVersioning(
  app: INestApplication,
  options?: VersioningOptions,
) {
  app.enableVersioning({
    type: VersioningType.URI,
    ...options,
  });
}

function enableDynamicAPIValidation(app: INestApplication, options: ValidationPipeOptions = {}) {
  app.useGlobalPipes(
    new ValidationPipe(options),
  );
}

export {
  enableDynamicAPISwagger,
  enableDynamicAPIVersioning,
  enableDynamicAPIValidation,
  DynamicAPISwaggerOptions,
  DynamicAPISwaggerExtraConfig,
};
