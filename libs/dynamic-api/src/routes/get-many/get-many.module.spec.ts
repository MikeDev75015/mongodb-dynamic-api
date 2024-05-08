import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyModule } from './get-many.module';
import * as GetManyHelpers from './get-many.helper';

jest.mock('./get-many.helper');

class Entity extends BaseEntity {}

describe('GetManyModule', () => {
  let spyCreateGetManyController: jest.SpyInstance;
  let spyCreateGetManyServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateGetManyController = jest.spyOn(GetManyHelpers, 'createGetManyController').mockReturnValue(FakeController);
    spyCreateGetManyServiceProvider = jest.spyOn(GetManyHelpers, 'createGetManyServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = GetManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: GetManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateGetManyController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetManyServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
