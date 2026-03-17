import { SwaggerDocumentOptions } from '@nestjs/swagger';
import {
  ExternalDocumentationObject,
  ParameterObject,
  SecuritySchemeObject,
  ServerVariableObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

type DynamicApiSwaggerExtraConfig = {
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
    [key: string]: unknown;
  };
  security?: {
    [key: string]: SecuritySchemeObject;
  };
  globalParameters?: ParameterObject[];
  securityRequirements?: {
    [key: string]: string[];
  };
  bearerAuth?: { options?: SecuritySchemeObject; name?: string } | boolean;
  oAuth2?: { options?: SecuritySchemeObject; name?: string } | boolean;
  apiKey?: { options?: SecuritySchemeObject; name?: string } | boolean;
  basicAuth?: { options?: SecuritySchemeObject; name?: string } | boolean;
  cookieAuth?: {
    cookieName?: string;
    options?: SecuritySchemeObject;
    securityName?: string;
  } | boolean;
};

type DynamicApiSwaggerOptions = {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  jsonFilePath?: string;
  swaggerExtraConfig?: DynamicApiSwaggerExtraConfig;
  swaggerDocumentOptions?: SwaggerDocumentOptions;
}

/**
 * @deprecated Use `DynamicApiSwaggerExtraConfig` instead. Will be removed in v5.
 */
type DynamicAPISwaggerExtraConfig = DynamicApiSwaggerExtraConfig;

/**
 * @deprecated Use `DynamicApiSwaggerOptions` instead. Will be removed in v5.
 */
type DynamicAPISwaggerOptions = DynamicApiSwaggerOptions;

export { DynamicApiSwaggerOptions, DynamicApiSwaggerExtraConfig, DynamicAPISwaggerOptions, DynamicAPISwaggerExtraConfig };
