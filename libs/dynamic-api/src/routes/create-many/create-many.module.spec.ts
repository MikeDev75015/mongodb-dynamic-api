import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyModule } from './create-many.module';
import * as CreateManyHelpers from './create-many.helper';

jest.mock('./create-many.helper');

class Entity extends BaseEntity {}

describe('CreateManyModule', () => {
  let spyCreateCreateManyController: jest.SpyInstance;
  let spyCreateCreateManyServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateCreateManyController = jest.spyOn(CreateManyHelpers, 'createCreateManyController').mockReturnValue(FakeController);
    spyCreateCreateManyServiceProvider = jest.spyOn(CreateManyHelpers, 'createCreateManyServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = CreateManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: CreateManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateCreateManyController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateManyServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
