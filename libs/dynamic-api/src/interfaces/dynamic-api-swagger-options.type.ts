import { SwaggerDocumentOptions } from '@nestjs/swagger';
import {
  ExternalDocumentationObject,
  ParameterObject,
  SecuritySchemeObject,
  ServerVariableObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

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

type DynamicAPISwaggerOptions = {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  jsonFilePath?: string;
  swaggerExtraConfig?: DynamicAPISwaggerExtraConfig;
  swaggerDocumentOptions?: SwaggerDocumentOptions;
}

export { DynamicAPISwaggerOptions, DynamicAPISwaggerExtraConfig };
