import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import * as ReplaceOneHelpers from './replace-one.helper';
import { ReplaceOneModule } from './replace-one.module';

vi.mock('./replace-one.helper');
vi.mock('../../helpers');

class Entity extends BaseEntity {}

describe('ReplaceOneModule', () => {
  let spyCreateReplaceOneController: Mock;
  let spyCreateReplaceOneServiceProvider: Mock;
  let spyCreateReplaceOneGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const routeConfigCallback = vi.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'ReplaceOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateReplaceOneController = vi.spyOn(ReplaceOneHelpers, 'createReplaceOneController').mockReturnValue(FakeController);
    spyCreateReplaceOneServiceProvider = vi.spyOn(ReplaceOneHelpers, 'createReplaceOneServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateReplaceOneGateway = vi.spyOn(ReplaceOneHelpers, 'createReplaceOneGateway').mockReturnValue(FakeGateway);
    vi.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = ReplaceOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: ReplaceOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateReplaceOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateReplaceOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = ReplaceOneModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: ReplaceOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateReplaceOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateReplaceOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback);
      expect(spyCreateReplaceOneGateway)
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

    it('should return a DynamicModule with broadcast service when broadcast is configured', () => {
      const broadcastRouteConfig: DynamicAPIRouteConfig<Entity> = {
        ...routeConfig,
        broadcast: { enabled: true },
      };
      const result = ReplaceOneModule.forFeature(databaseModule, Entity, controllerOptions, broadcastRouteConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: ReplaceOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, DynamicApiBroadcastService],
      });
    });
  });
});
