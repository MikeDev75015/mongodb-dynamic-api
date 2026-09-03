import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as FormatHelpers from '../../helpers/format.helper';
import * as SocketConfigHelpers from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import * as DeleteOneHelpers from './delete-one.helper';
import { DeleteOneModule } from './delete-one.module';

vi.mock('./delete-one.helper');
vi.mock('../../helpers/format.helper');
vi.mock('../../helpers/socket-config.helper');

class Entity extends BaseEntity {}

describe('DeleteOneModule', () => {
  let spyCreateDeleteOneController: Mock;
  let spyCreateDeleteOneServiceProvider: Mock;
  let spyCreateDeleteOneGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteOne' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateDeleteOneController = vi.spyOn(DeleteOneHelpers, 'createDeleteOneController').mockReturnValue(FakeController);
    spyCreateDeleteOneServiceProvider = vi.spyOn(DeleteOneHelpers, 'createDeleteOneServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateDeleteOneGateway = vi.spyOn(DeleteOneHelpers, 'createDeleteOneGateway').mockReturnValue(FakeGateway);
    vi.spyOn(FormatHelpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(SocketConfigHelpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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
      expect(spyCreateDeleteOneServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfig.callback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback, routeConfig.beforeDeleteCallback, routeConfig.cascade);
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
      expect(spyCreateDeleteOneServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfig.callback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback, routeConfig.beforeDeleteCallback, routeConfig.cascade);
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

    it('should return a DynamicModule with broadcast service when broadcast is configured', () => {
      const broadcastRouteConfig: DynamicAPIRouteConfig<Entity> = {
        ...routeConfig,
        broadcast: { enabled: true },
      };
      const result = DeleteOneModule.forFeature(databaseModule, Entity, controllerOptions, broadcastRouteConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, DynamicApiBroadcastService],
      });
    });
  });
});
