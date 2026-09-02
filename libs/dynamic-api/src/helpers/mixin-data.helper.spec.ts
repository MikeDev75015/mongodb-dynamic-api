import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { MongoDBDynamicApiLogger } from '../logger';
import { BaseEntity } from '../models';
import { CreateManyBodyMixin } from '../routes';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { DynamicApiEventRegistryStore } from './event-registry.store';
import { getMixinData } from './mixin-data.helper';

describe('getMixinData', () => {
  class TestEntity extends BaseEntity {}
  const controllerOptions = { path: '/', apiTag: 'Test', isPublic: true, abilityPredicates: [] };
  const routeConfig = { description: 'Test', dTOs: {}, isPublic: true, abilityPredicate: () => true };
  class CustomDTO {}

  beforeEach(() => {
    DynamicApiEventRegistryStore.reset();
  });

  it('should return valid controller mixin data for CreateMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateMany',
        ...routeConfig,
      },
    );

    const body = { list: [{ unit: 'test' }] };
    const dto = plainToInstance(CreateManyBodyMixin(TestEntity), body);

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateMany');
    expect(dto).toHaveProperty('list');
    expect(dto.list).toHaveLength(1);
  });

  it('should return valid controller mixin data for CreateMany route type with custom body', () => {
    class CreateManyDTO {
      list: CustomDTO[];
    }
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateMany',
        ...routeConfig,
        dTOs: { body: CreateManyDTO },
      },
    );

    expect(result).toBeDefined();
  });

  it('should return valid controller mixin data for CreateOne route type', () => {
    const { abilityPredicate, isPublic, ...createOneRouteConfig } = routeConfig;
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateOne',
        ...createOneRouteConfig,
        dTOs: { body: CustomDTO },
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateOne');
  });

  it('should return valid controller mixin data for DuplicateMany route type', () => {
    const result = getMixinData(
      TestEntity,
      { ...controllerOptions, isPublic: undefined },
      {
        type: 'DuplicateMany',
        ...routeConfig,
        isPublic: undefined,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateMany');
  });

  it('should return valid controller mixin data for DuplicateOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DuplicateOne',
        ...routeConfig,
        dTOs: { presenter: CustomDTO },
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateOne');
  });

  it.each(['DeleteMany', 'DeleteOne', 'ReplaceOne', 'UpdateMany', 'UpdateOne'] as const)(
    'should return valid controller mixin data for %s route type',
    (type) => {
      const result = getMixinData(
        TestEntity,
        controllerOptions,
        {
          type,
          ...routeConfig,
        },
      );

      expect(result).toBeDefined();
      expect(result.routeType).toEqual(type);
    },
  );

  it('should return valid controller mixin data for GetMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetMany',
        ...routeConfig,
        dTOs: undefined,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetMany');
  });

  it('should return valid controller mixin data for GetOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetOne',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetOne');
    expect(result.displayedName).toEqual('Test');
    expect(result.description).toEqual('Test');
    expect(result.isPublic).toEqual(true);
    expect(result.abilityPredicate).toBeDefined();
  });

  it('should use route-level disableCache when it is a boolean', () => {
    const result = getMixinData(
      TestEntity,
      { ...controllerOptions, disableCache: undefined },
      {
        type: 'GetMany',
        ...routeConfig,
        disableCache: true,
      },
    );

    expect(result.disableCache).toBe(true);
  });

  it('should use controller-level disableCache when route-level is not a boolean', () => {
    const result = getMixinData(
      TestEntity,
      { ...controllerOptions, disableCache: true },
      {
        type: 'GetMany',
        ...routeConfig,
        disableCache: undefined,
      },
    );

    expect(result.disableCache).toBe(true);
  });

  describe('predicateBehavior "filter" + active cache boot-time warning', () => {
    let warnSpy: Mock;

    beforeEach(() => {
      // eslint-disable-next-line no-new
      new DynamicApiGlobalStateService(); // reset shared static state to defaults (isGlobalCacheEnabled: true)
      warnSpy = vi.spyOn(MongoDBDynamicApiLogger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should warn for GetMany combining a non-public route, an abilityPredicate, filter mode, and an active cache', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: false, predicateBehavior: 'filter' },
      );

      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/predicateBehavior 'filter'/));
    });

    it('should warn for Aggregate the same way', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'Aggregate', ...routeConfig, isPublic: false, predicateBehavior: 'filter' },
      );

      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/predicateBehavior 'filter'/));
    });

    it('should not warn when disableCache is true on the route', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: false, predicateBehavior: 'filter', disableCache: true },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn when global cache is disabled', () => {
      new DynamicApiGlobalStateService({ isGlobalCacheEnabled: false });

      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: false, predicateBehavior: 'filter' },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for GetOne (filter mode is only implemented for GetMany/Aggregate)', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetOne', ...routeConfig, isPublic: false, predicateBehavior: 'filter' },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn when predicateBehavior is "throw"', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: false, predicateBehavior: 'throw' },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn when there is no abilityPredicate', () => {
      const { abilityPredicate, ...routeConfigWithoutPredicate } = routeConfig;

      getMixinData(
        TestEntity,
        { ...controllerOptions, abilityPredicates: [] },
        { type: 'GetMany', ...routeConfigWithoutPredicate, isPublic: false, predicateBehavior: 'filter' },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for a gateway route (isGateway=true)', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: false, predicateBehavior: 'filter' },
        true,
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for a public route (response is meant to be shared by every caller)', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'GetMany', ...routeConfig, isPublic: true, predicateBehavior: 'filter' },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('broadcast event registration', () => {
    it('should not register anything when broadcastConfig is not provided', () => {
      getMixinData(TestEntity, controllerOptions, { type: 'CreateOne', ...routeConfig });

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([]);
    });

    it('should register the default event name on the http channel for a controller mixin', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig },
        false,
        { enabled: true },
      );

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([
        {
          event: 'create-one-test',
          routeType: 'CreateOne',
          entityName: 'TestEntity',
          displayedName: 'Test',
          channels: ['http'],
          hasRoomTargeting: false,
          hasAbilityPredicate: false,
          isCustomEventName: false,
        },
      ]);
    });

    it('should register on the ws channel for a gateway mixin', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig },
        true,
        { enabled: true },
      );

      expect(DynamicApiEventRegistryStore.getAll()[0].channels).toEqual(['ws']);
    });

    it('should register the broadcastConfig.eventName override rather than the default event name', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig },
        false,
        { enabled: true, eventName: 'custom-event' },
      );

      expect(DynamicApiEventRegistryStore.getAll()[0]).toMatchObject({
        event: 'custom-event',
        isCustomEventName: true,
      });
    });

    it('should reflect rooms and ability predicate flags in the descriptor', () => {
      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig },
        false,
        { enabled: () => true, rooms: 'room-a' },
      );

      expect(DynamicApiEventRegistryStore.getAll()[0]).toMatchObject({
        hasRoomTargeting: true,
        hasAbilityPredicate: true,
      });
    });

    it('should merge channels when the same route registers on both http and ws', () => {
      const broadcastConfig = { enabled: true };

      getMixinData(TestEntity, controllerOptions, { type: 'CreateOne', ...routeConfig }, false, broadcastConfig);
      getMixinData(TestEntity, controllerOptions, { type: 'CreateOne', ...routeConfig }, true, broadcastConfig);

      expect(DynamicApiEventRegistryStore.getAll()).toHaveLength(1);
      expect(DynamicApiEventRegistryStore.getAll()[0].channels).toEqual(['http', 'ws']);
    });

    it('should log a collision when two different routes resolve to the same event name', () => {
      vi.spyOn(DynamicApiEventRegistryStore['logger'], 'warn').mockImplementation();

      getMixinData(
        TestEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig, eventName: 'shared' },
        false,
        { enabled: true },
      );

      class OtherEntity extends BaseEntity {}
      getMixinData(
        OtherEntity,
        controllerOptions,
        { type: 'CreateOne', ...routeConfig, eventName: 'shared' },
        false,
        { enabled: true },
      );

      expect(DynamicApiEventRegistryStore.getCollisions()).toHaveLength(1);
    });
  });
});