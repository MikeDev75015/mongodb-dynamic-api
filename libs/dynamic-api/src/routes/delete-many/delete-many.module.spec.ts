import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import * as DeleteManyHelpers from './delete-many.helper';
import { DeleteManyModule } from './delete-many.module';

vi.mock('./delete-many.helper');
vi.mock('../../helpers');

class Entity extends BaseEntity {}

describe('DeleteManyModule', () => {
  let spyCreateDeleteManyController: Mock;
  let spyCreateDeleteManyServiceProvider: Mock;
  let spyCreateDeleteManyGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteMany' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateDeleteManyController = vi.spyOn(DeleteManyHelpers, 'createDeleteManyController').mockReturnValue(FakeController);
    spyCreateDeleteManyServiceProvider = vi.spyOn(DeleteManyHelpers, 'createDeleteManyServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateDeleteManyGateway = vi.spyOn(DeleteManyHelpers, 'createDeleteManyGateway').mockReturnValue(FakeGateway);
    vi.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(Helpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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
      expect(spyCreateDeleteManyServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfig.callback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback, routeConfig.beforeDeleteCallback, routeConfig.cascade);
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
      expect(spyCreateDeleteManyServiceProvider).toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfig.callback, retry: routeConfig.callbackRetry }, routeConfig.beforeSaveCallback, routeConfig.beforeDeleteCallback, routeConfig.cascade);
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

    it('should return a DynamicModule with broadcast service when broadcast is configured', () => {
      const broadcastRouteConfig: DynamicAPIRouteConfig<Entity> = {
        ...routeConfig,
        broadcast: { enabled: true },
      };
      const result = DeleteManyModule.forFeature(databaseModule, Entity, controllerOptions, broadcastRouteConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, DynamicApiBroadcastService],
      });
    });
  });
});
