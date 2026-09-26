import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication, ValidationPipeOptions } from '@nestjs/common';
import { closeApp, initApp } from '../../__mocks__/app.mock';
import { DynamicApiValidationPipe } from '../pipes/dynamic-api-validation.pipe';
import { enableDynamicAPIValidation } from './validation-config.helper';

describe('ValidationConfigHelper', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
  });

  describe('enableDynamicAPIValidation', () => {
    it('should call useGlobalPipes with default pipe options', () => {
      const useGlobalPipesSpy = vi.spyOn(app, 'useGlobalPipes');

      enableDynamicAPIValidation(app);

      expect(useGlobalPipesSpy).toHaveBeenCalledWith(expect.any(DynamicApiValidationPipe));
    });

    it('should call useGlobalPipes with custom pipe options', () => {
      const useGlobalPipesSpy = vi.spyOn(app, 'useGlobalPipes');
      const customOptions = {
        transform: true,
        disableErrorMessages: true,
      } as ValidationPipeOptions;

      enableDynamicAPIValidation(
        app,
        customOptions,
      );

      expect(useGlobalPipesSpy).toHaveBeenCalledWith(expect.any(DynamicApiValidationPipe));
    });
  });

  afterAll(async () => {
    await closeApp(app);
  });
});
