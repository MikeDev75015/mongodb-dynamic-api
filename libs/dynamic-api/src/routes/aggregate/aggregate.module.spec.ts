import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as AggregateHelpers from './aggregate.helper';
import { AggregateModule } from './aggregate.module';

jest.mock('./aggregate.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('AggregateModule', () => {
  let spyCreateAggregateController: jest.SpyInstance;
  let spyCreateAggregateServiceProvider: jest.SpyInstance;
  let spyCreateAggregateGateway: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = jest.fn();

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'Aggregate', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateAggregateController = jest.spyOn(AggregateHelpers, 'createAggregateController').mockReturnValue(FakeController);
    spyCreateAggregateServiceProvider = jest.spyOn(AggregateHelpers, 'createAggregateServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateAggregateGateway = jest.spyOn(AggregateHelpers, 'createAggregateGateway').mockReturnValue(FakeGateway);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    jest.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = AggregateModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: AggregateModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateAggregateController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateAggregateServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = AggregateModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: AggregateModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateAggregateController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateAggregateServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
      expect(spyCreateAggregateGateway)
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
