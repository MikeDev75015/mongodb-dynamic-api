import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as FormatHelpers from '../../helpers/format.helper';
import * as SocketConfigHelpers from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIServiceProvider, GetManyRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as GetManyHelpers from './get-many.helper';
import { GetManyModule } from './get-many.module';

vi.mock('./get-many.helper');
vi.mock('../../helpers/format.helper');
vi.mock('../../helpers/socket-config.helper');

class Entity extends BaseEntity {}

describe('GetManyModule', () => {
  let spyCreateGetManyController: Mock;
  let spyCreateGetManyServiceProvider: Mock;
  let spyCreateGetManyGateway: Mock;

  const FakeController = vi.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;
  const FakeGateway = vi.fn();

  const routeConfigCallback = vi.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: GetManyRouteConfig<Entity> = { type: 'GetMany', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';
  const fakeGatewayOptions = { namespace: 'fakeNamespace' };

  beforeEach(() => {
    spyCreateGetManyController = vi.spyOn(GetManyHelpers, 'createGetManyController').mockReturnValue(FakeController);
    spyCreateGetManyServiceProvider = vi.spyOn(GetManyHelpers, 'createGetManyServiceProvider').mockReturnValue(FakeServiceProvider);
    spyCreateGetManyGateway = vi.spyOn(GetManyHelpers, 'createGetManyGateway').mockReturnValue(FakeGateway);
    vi.spyOn(FormatHelpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
    vi.spyOn(SocketConfigHelpers, 'initializeConfigFromOptions').mockReturnValue(fakeGatewayOptions);
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
      .toHaveBeenCalledWith(
        Entity, fakeDisplayedName, version,
        { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, undefined, undefined, routeConfig.populate,
      );
    });

    it('should forward populate from the route config to createGetManyServiceProvider', () => {
      const routeConfigWithPopulate: GetManyRouteConfig<Entity> = { type: 'GetMany', populate: ['author', 'comments'] };

      GetManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfigWithPopulate, version, validationPipeOptions);

      expect(spyCreateGetManyServiceProvider)
      .toHaveBeenCalledWith(
        Entity, fakeDisplayedName, version, { callback: undefined, retry: undefined }, undefined, undefined, ['author', 'comments'],
      );
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
      .toHaveBeenCalledWith(
        Entity, fakeDisplayedName, version,
        { callback: routeConfigCallback, retry: routeConfig.callbackRetry }, undefined, undefined, routeConfig.populate,
      );
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
