import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyModule } from './update-many.module';
import * as UpdateManyHelpers from './update-many.helper';

jest.mock('./update-many.helper');

class Entity extends BaseEntity {}

describe('UpdateManyModule', () => {
  let spyCreateUpdateManyController: jest.SpyInstance;
  let spyCreateUpdateManyServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateUpdateManyController = jest.spyOn(UpdateManyHelpers, 'createUpdateManyController').mockReturnValue(FakeController);
    spyCreateUpdateManyServiceProvider = jest.spyOn(UpdateManyHelpers, 'createUpdateManyServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = UpdateManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: UpdateManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateUpdateManyController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateUpdateManyServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
