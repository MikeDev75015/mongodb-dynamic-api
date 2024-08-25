import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as DeleteOneHelpers from './delete-one.helper';
import { DeleteOneModule } from './delete-one.module';

jest.mock('./delete-one.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('DeleteOneModule', () => {
  let spyCreateDeleteOneController: jest.SpyInstance;
  let spyCreateDeleteOneServiceProvider: jest.SpyInstance;
  let spyCreateDeleteOneGateway: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = jest.fn();

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteOne' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateDeleteOneController = jest.spyOn(DeleteOneHelpers, 'createDeleteOneController').mockReturnValue(FakeController);
    spyCreateDeleteOneServiceProvider = jest.spyOn(DeleteOneHelpers, 'createDeleteOneServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateDeleteOneGateway = jest.spyOn(DeleteOneHelpers, 'createDeleteOneGateway').mockReturnValue(FakeGateway);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    jest.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DeleteOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDeleteOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteOneServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = DeleteOneModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: DeleteOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateDeleteOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteOneServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version);
      expect(spyCreateDeleteOneGateway).toHaveBeenCalledWith(
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
