import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateOneModule } from './update-one.module';
import * as UpdateOneHelpers from './update-one.helper';

jest.mock('./update-one.helper');

class Entity extends BaseEntity {}

describe('UpdateOneModule', () => {
  let spyCreateUpdateOneController: jest.SpyInstance;
  let spyCreateUpdateOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateUpdateOneController = jest.spyOn(UpdateOneHelpers, 'createUpdateOneController').mockReturnValue(FakeController);
    spyCreateUpdateOneServiceProvider = jest.spyOn(UpdateOneHelpers, 'createUpdateOneServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = UpdateOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: UpdateOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateUpdateOneController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateUpdateOneServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
