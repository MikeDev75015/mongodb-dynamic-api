import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as GetManyHelpers from './get-many.helper';
import { GetManyModule } from './get-many.module';

jest.mock('./get-many.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('GetManyModule', () => {
  let spyCreateGetManyController: jest.SpyInstance;
  let spyCreateGetManyServiceProvider: jest.SpyInstance;
  let spyCreateGetManyGateway: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = jest.fn();

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateGetManyController = jest.spyOn(GetManyHelpers, 'createGetManyController').mockReturnValue(FakeController);
    spyCreateGetManyServiceProvider = jest.spyOn(GetManyHelpers, 'createGetManyServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateGetManyGateway = jest.spyOn(GetManyHelpers, 'createGetManyGateway').mockReturnValue(FakeGateway);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    jest.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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

      expect(spyCreateGetManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetManyServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = GetManyModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: GetManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateGetManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetManyServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
      expect(spyCreateGetManyGateway)
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
