import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { enableDynamicAPISwagger, enableDynamicAPIValidation, enableDynamicAPIVersioning } from './config.helper';

describe('ConfigHelper', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({})
    .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  describe('enableDynamicAPISwagger', () => {
    let createDocumentSpy: jest.SpyInstance;
    let setupSpy: jest.SpyInstance;
    const document = {} as OpenAPIObject;

    beforeEach(() => {
      createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument');
      setupSpy = jest.spyOn(SwaggerModule, 'setup');
    });

    it('should call createDocument with default config', () => {
      createDocumentSpy.mockReturnValue(document);

      enableDynamicAPISwagger(app);

      expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object), undefined);
      expect(setupSpy).toHaveBeenCalledWith(expect.any(String), app, document);
    });

    it('should call createDocument with custom config', () => {
      createDocumentSpy.mockReturnValue(document);

      enableDynamicAPISwagger(app, {
        title: 'My API',
        description: 'My description',
        path: '/custom-path',
        swaggerConfig: {
          tags: [{ name: 'MyTag', description: 'MyTag description' }],
          termsOfService: 'My terms of service',
          contact: { name: 'My contact', email: 'test', url: 'http://localhost:3000' },
          servers: [{ url: 'http://localhost:3000' }],
          externalDocs: { description: 'My external docs', url: 'http://localhost:3000' },
          basePath: 'My base path',
          extensions: { 'x-foo': 'bar' },
          apiKey: { type: 'apiKey', name: 'api_key', 'x-tokenName': 'token' },
          bearerAuth: { type: 'http', scheme: 'bearer' },
          security: { basicAuth: { type: 'http', scheme: 'basic' } },
          securityRequirements: { basic: ['read', 'write'] },
          globalParameters: [{ name: 'MyParam', in: 'header', schema: { type: 'string' } }],
          basicAuth: { type: 'http', scheme: 'basic' },
          cookieAuth: {
            cookieName: 'MyCookie',
            options: { type: 'apiKey', name: 'api_key', in: 'header' },
            securityName: 'MySecurity',
          },
          license: { name: 'My license', url: 'http://localhost:3000' },
          oAuth2: { type: 'oauth2', flows: { implicit: { authorizationUrl: 'http://localhost:3000', scopes: {} } } },
        },
        swaggerOptions: { deepScanRoutes: true },
      });

      expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object), { deepScanRoutes: true });
      expect(setupSpy).toHaveBeenCalledWith('/custom-path', app, document);
    });
  });

  describe('enableDynamicAPIVersioning', () => {
    it('should call enableVersioning with default options', () => {
      const enableVersioningSpy = jest.spyOn(app, 'enableVersioning');

      enableDynamicAPIVersioning(app);

      expect(enableVersioningSpy).toHaveBeenCalledWith({ type: VersioningType.URI });
    });

    it('should call enableVersioning with custom options', () => {
      const enableVersioningSpy = jest.spyOn(app, 'enableVersioning');
      const customOptions = {
        type: VersioningType.CUSTOM,
        defaultVersion: '1.0',
        extractor: (req) => '1.0',
      } as VersioningOptions;

      enableDynamicAPIVersioning(
        app,
        customOptions,
      );

      expect(enableVersioningSpy).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('enableDynamicAPIValidation', () => {
    it('should call useGlobalPipes with default pipe options', () => {
      const useGlobalPipesSpy = jest.spyOn(app, 'useGlobalPipes');

      enableDynamicAPIValidation(app);

      expect(useGlobalPipesSpy).toHaveBeenCalledWith(expect.any(ValidationPipe));
    });

    it('should call useGlobalPipes with custom pipe options', () => {
      const useGlobalPipesSpy = jest.spyOn(app, 'useGlobalPipes');
      const customOptions = {
        transform: true,
        disableErrorMessages: true,
      } as ValidationPipeOptions;


      enableDynamicAPIValidation(
        app,
        customOptions,
      );

      expect(useGlobalPipesSpy).toHaveBeenCalledWith(expect.any(ValidationPipe));
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
