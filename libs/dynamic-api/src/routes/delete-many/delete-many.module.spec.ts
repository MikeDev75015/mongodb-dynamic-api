import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as DeleteManyHelpers from './delete-many.helper';
import { DeleteManyModule } from './delete-many.module';

jest.mock('./delete-many.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('DeleteManyModule', () => {
  let spyCreateDeleteManyController: jest.SpyInstance;
  let spyCreateDeleteManyServiceProvider: jest.SpyInstance;
  let spyCreateDeleteManyGateway: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = jest.fn();

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteMany' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateDeleteManyController = jest.spyOn(DeleteManyHelpers, 'createDeleteManyController').mockReturnValue(FakeController);
    spyCreateDeleteManyServiceProvider = jest.spyOn(DeleteManyHelpers, 'createDeleteManyServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateDeleteManyGateway = jest.spyOn(DeleteManyHelpers, 'createDeleteManyGateway').mockReturnValue(FakeGateway);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    jest.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DeleteManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDeleteManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteManyServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = DeleteManyModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: DeleteManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateDeleteManyController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteManyServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version);
      expect(spyCreateDeleteManyGateway).toHaveBeenCalledWith(
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
