import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateManyModule } from './duplicate-many.module';
import * as DuplicateManyHelpers from './duplicate-many.helper';

jest.mock('./duplicate-many.helper');

class Entity extends BaseEntity {}

describe('DuplicateManyModule', () => {
  let spyCreateDuplicateManyController: jest.SpyInstance;
  let spyCreateDuplicateManyServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateDuplicateManyController = jest.spyOn(DuplicateManyHelpers, 'createDuplicateManyController').mockReturnValue(FakeController);
    spyCreateDuplicateManyServiceProvider = jest.spyOn(DuplicateManyHelpers, 'createDuplicateManyServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DuplicateManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DuplicateManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDuplicateManyController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDuplicateManyServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
