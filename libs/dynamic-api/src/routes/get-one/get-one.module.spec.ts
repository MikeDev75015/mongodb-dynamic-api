import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as FormatHelpers from '../../helpers/format.helper';
import * as SocketConfigHelpers from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIServiceProvider, GetOneRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as GetOneHelpers from './get-one.helper';
import { GetOneModule } from './get-one.module';

vi.mock('./get-one.helper');
vi.mock('../../helpers/format.helper');
vi.mock('../../helpers/socket-config.helper');

class Entity extends BaseEntity {}

describe('GetOneModule', () => {
  let spyCreateGetOneController: Mock;
  let spyCreateGetOneServiceProvider: Mock;
  let spyCreateGetOneGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const routeConfigCallback = vi.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: GetOneRouteConfig<Entity> = { type: 'GetOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateGetOneController = vi.spyOn(GetOneHelpers, 'createGetOneController').mockReturnValue(FakeController);
    spyCreateGetOneServiceProvider = vi.spyOn(GetOneHelpers, 'createGetOneServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateGetOneGateway = vi.spyOn(GetOneHelpers, 'createGetOneGateway').mockReturnValue(FakeGateway);
    vi.spyOn(FormatHelpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(SocketConfigHelpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = GetOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: GetOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateGetOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetOneServiceProvider)
      .toHaveBeenCalledWith(
        Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfig.populate,
      );
    });

    it('should forward populate from the route config to createGetOneServiceProvider', () => {
      const routeConfigWithPopulate: GetOneRouteConfig<Entity> = { type: 'GetOne', populate: 'author' };

      GetOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfigWithPopulate, version, validationPipeOptions);

      expect(spyCreateGetOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, { callback: undefined, retry: undefined }, 'author');
    });

    it('should return a DynamicModule with gateway', () => {
      const result = GetOneModule.forFeature(
        databaseModule,
        Entity,
        controllerOptions,
        routeConfig,
        version,
        validationPipeOptions,
        true,
      );

      expect(result).toEqual({
        module: GetOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider, FakeGateway],
      });

      expect(spyCreateGetOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetOneServiceProvider)
      .toHaveBeenCalledWith(
        Entity, fakeDisplayedName, version, { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, routeConfig.populate,
      );
      expect(spyCreateGetOneGateway)
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
