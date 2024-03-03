import { INestApplication, VersioningOptions, VersioningType } from '@nestjs/common';
import { closeApp, initApp } from '../../__mocks__/app.mock';
import { enableDynamicAPIVersioning } from './versioning-config.helper';

describe('VersioningConfigHelper', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
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
        extractor: (_) => '1.0',
      } as VersioningOptions;

      enableDynamicAPIVersioning(
        app,
        customOptions,
      );

      expect(enableVersioningSpy).toHaveBeenCalledWith(customOptions);
    });
  });

  afterAll(async () => {
    await closeApp(app);
  });
});
