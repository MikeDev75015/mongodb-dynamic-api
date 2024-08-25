import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as CreateManyHelpers from './create-many.helper';
import { CreateManyModule } from './create-many.module';

jest.mock('./create-many.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('CreateManyModule', () => {
  let spyCreateCreateManyController: jest.SpyInstance;
  let spyCreateCreateManyServiceProvider: jest.SpyInstance;
  let spyCreateCreateManyGateway: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = jest.fn();

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateCreateManyController = jest.spyOn(CreateManyHelpers, 'createCreateManyController').mockReturnValue(FakeController);
    spyCreateCreateManyServiceProvider = jest.spyOn(CreateManyHelpers, 'createCreateManyServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateCreateManyGateway = jest.spyOn(CreateManyHelpers, 'createCreateManyGateway').mockReturnValue(FakeGateway);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    jest.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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

      expect(spyCreateCreateManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateManyServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = CreateManyModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: CreateManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateCreateManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateManyServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
      expect(spyCreateCreateManyGateway)
      .toHaveBeenCalledWith(
        Entity,
        fakeDisplayedName,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        fakeGatewayOptions,
      );
    });
  });
});
