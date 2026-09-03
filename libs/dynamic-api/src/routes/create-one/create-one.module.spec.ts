import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as FormatHelpers from '../../helpers/format.helper';
import * as SocketConfigHelpers from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import * as CreateOneHelpers from './create-one.helper';
import { CreateOneModule } from './create-one.module';

vi.mock('./create-one.helper');
vi.mock('../../helpers/format.helper');
vi.mock('../../helpers/socket-config.helper');

class Entity extends BaseEntity {}

describe('CreateOneModule', () => {
  let spyCreateCreateOneController: Mock;
  let spyCreateCreateOneServiceProvider: Mock;
  let spyCreateCreateOneGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const routeConfigCallback = vi.fn();
  const routeConfigBeforeSaveCallback = vi.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = {
    type: 'CreateOne',
    callback: routeConfigCallback,
    beforeSaveCallback: routeConfigBeforeSaveCallback,
  };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateCreateOneController = vi.spyOn(CreateOneHelpers, 'createCreateOneController').mockReturnValue(FakeController);
    spyCreateCreateOneServiceProvider = vi.spyOn(CreateOneHelpers, 'createCreateOneServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateCreateOneGateway = vi.spyOn(CreateOneHelpers, 'createCreateOneGateway').mockReturnValue(FakeGateway);
    vi.spyOn(FormatHelpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(SocketConfigHelpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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

      expect(spyCreateCreateOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfigBeforeSaveCallback);
    });

    it('should return a DynamicModule with gateway', () => {
      const result = CreateOneModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: CreateOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateCreateOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateCreateOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfigBeforeSaveCallback);
      expect(spyCreateCreateOneGateway)
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
      const result = CreateOneModule.forFeature(databaseModule, Entity, controllerOptions, broadcastRouteConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: CreateOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, DynamicApiBroadcastService],
      });
    });
  });
});
