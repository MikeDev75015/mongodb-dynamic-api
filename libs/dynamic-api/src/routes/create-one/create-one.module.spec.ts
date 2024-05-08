import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneModule } from './create-one.module';
import * as CreateOneHelpers from './create-one.helper';

jest.mock('./create-one.helper');

class Entity extends BaseEntity {}

describe('CreateOneModule', () => {
  let spyCreateCreateOneController: jest.SpyInstance;
  let spyCreateCreateOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateCreateOneController = jest.spyOn(CreateOneHelpers, 'createCreateOneController').mockReturnValue(FakeController);
    spyCreateCreateOneServiceProvider = jest.spyOn(CreateOneHelpers, 'createCreateOneServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = CreateOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: CreateOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateCreateOneController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateOneServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
