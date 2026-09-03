import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as FormatHelpers from '../../helpers/format.helper';
import * as SocketConfigHelpers from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as AggregateHelpers from './aggregate.helper';
import { AggregateModule } from './aggregate.module';

vi.mock('./aggregate.helper');
vi.mock('../../helpers/format.helper');
vi.mock('../../helpers/socket-config.helper');

class Entity extends BaseEntity {}

describe('AggregateModule', () => {
  let spyCreateAggregateController: Mock;
  let spyCreateAggregateServiceProvider: Mock;
  let spyCreateAggregateGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const routeConfigCallback = vi.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'Aggregate', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateAggregateController = vi.spyOn(AggregateHelpers, 'createAggregateController').mockReturnValue(FakeController);
    spyCreateAggregateServiceProvider = vi.spyOn(AggregateHelpers, 'createAggregateServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateAggregateGateway = vi.spyOn(AggregateHelpers, 'createAggregateGateway').mockReturnValue(FakeGateway);
    vi.spyOn(FormatHelpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(SocketConfigHelpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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
      expect(spyCreateAggregateServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, undefined, undefined);
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
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, undefined, undefined);
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
