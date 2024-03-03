import { INestApplication, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { closeApp, initApp } from '../../__mocks__/app.mock';
import { enableDynamicAPIValidation } from './validation-config.helper';

describe('ValidationConfigHelper', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
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
    await closeApp(app);
  });
});
