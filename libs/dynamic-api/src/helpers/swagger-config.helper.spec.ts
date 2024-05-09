import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { closeApp, initApp } from '../../__mocks__/app.mock';
import { DynamicAPISwaggerExtraConfig } from '../interfaces';
import { enableDynamicAPISwagger } from './swagger-config.helper';

describe('SwaggerConfigHelper', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
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
        swaggerExtraConfig: {
          tags: [{ name: 'MyTag', description: 'MyTag description' }],
          termsOfService: 'My terms of service',
          contact: { name: 'My contact', email: 'test', url: 'http://localhost:3000' },
          servers: [{ url: 'http://localhost:3000' }],
          externalDocs: { description: 'My external docs', url: 'http://localhost:3000' },
          basePath: 'My base path',
          extensions: { 'x-foo': 'bar' },
          apiKey: { name: 'api_key' },
          bearerAuth: true,
          security: { basicAuth: { type: 'http', scheme: 'basic' } },
          securityRequirements: { basic: ['read', 'write'] },
          globalParameters: [{ name: 'MyParam', in: 'header', schema: { type: 'string' } }],
          basicAuth: { name: 'basic' },
          cookieAuth: {
            cookieName: 'MyCookie',
            options: { type: 'apiKey', name: 'api_key', in: 'header' },
            securityName: 'MySecurity',
          },
          license: { name: 'My license', url: 'http://localhost:3000' },
          oAuth2: true,
        },
        swaggerDocumentOptions: { deepScanRoutes: true },
      });

      expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object), { deepScanRoutes: true });
      expect(setupSpy).toHaveBeenCalledWith('/custom-path', app, document);
    });

    it('should call createDocument with another config', () => {
      createDocumentSpy.mockReturnValue(document);

      enableDynamicAPISwagger(app, {
        swaggerExtraConfig: {
          apiKey: true,
          bearerAuth: { name: 'bearer' },
          basicAuth: true,
          cookieAuth: true,
          oAuth2: { options: { type: 'apiKey', name: 'api', in: 'header' } },
          fakeKey: 'fakeValue',
        } as DynamicAPISwaggerExtraConfig,
        swaggerDocumentOptions: { deepScanRoutes: true },
      });

      expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object), { deepScanRoutes: true });
      expect(setupSpy).toHaveBeenCalledWith('/dynamic-api', app, document);
    });
  });

  afterAll(async () => {
    await closeApp(app);
  });
});
