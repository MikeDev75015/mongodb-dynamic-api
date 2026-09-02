import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicApiEventRegistryStore } from './event-registry.store';

describe('DynamicApiEventRegistryStore', () => {
  beforeEach(() => {
    DynamicApiEventRegistryStore.reset();
  });

  describe('register', () => {
    it('should register a new event with a single channel', () => {
      DynamicApiEventRegistryStore.register({
        event: 'create-one-user',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([
        {
          event: 'create-one-user',
          routeType: 'CreateOne',
          entityName: 'User',
          displayedName: 'User',
          channels: ['http'],
          hasRoomTargeting: false,
          hasAbilityPredicate: false,
          isCustomEventName: false,
        },
      ]);
    });

    it('should merge channels when the same route registers the same event on a different channel', () => {
      DynamicApiEventRegistryStore.register({
        event: 'create-one-user',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });
      DynamicApiEventRegistryStore.register({
        event: 'create-one-user',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'ws',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });

      expect(DynamicApiEventRegistryStore.getAll()).toHaveLength(1);
      expect(DynamicApiEventRegistryStore.getAll()[0].channels).toEqual(['http', 'ws']);
      expect(DynamicApiEventRegistryStore.getCollisions()).toEqual([]);
    });

    it('should not duplicate a channel when the same route registers the same event on the same channel twice', () => {
      const registration = {
        event: 'create-one-user',
        routeType: 'CreateOne' as const,
        entityName: 'User',
        displayedName: 'User',
        channel: 'http' as const,
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      };

      DynamicApiEventRegistryStore.register(registration);
      DynamicApiEventRegistryStore.register(registration);

      expect(DynamicApiEventRegistryStore.getAll()[0].channels).toEqual(['http']);
    });

    it('should warn and record a collision when a different route registers the same event name', () => {
      const warnSpy = vi.spyOn(DynamicApiEventRegistryStore['logger'], 'warn').mockImplementation();

      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: true,
      });
      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'Company',
        displayedName: 'Company',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: true,
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('shared-event'));
      expect(DynamicApiEventRegistryStore.getCollisions()).toEqual([
        {
          event: 'shared-event',
          registrations: [
            { routeType: 'CreateOne', entityName: 'User' },
            { routeType: 'CreateOne', entityName: 'Company' },
          ],
        },
      ]);
      // the first registration is left untouched
      expect(DynamicApiEventRegistryStore.getAll()).toEqual([
        {
          event: 'shared-event',
          routeType: 'CreateOne',
          entityName: 'User',
          displayedName: 'User',
          channels: ['http'],
          hasRoomTargeting: false,
          hasAbilityPredicate: false,
          isCustomEventName: true,
        },
      ]);
    });
  });

  describe('getCollisions', () => {
    it('should return a copy that does not mutate internal state', () => {
      vi.spyOn(DynamicApiEventRegistryStore['logger'], 'warn').mockImplementation();

      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });
      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'Company',
        displayedName: 'Company',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });

      const collisions = DynamicApiEventRegistryStore.getCollisions();
      collisions.push({ event: 'injected', registrations: [] });

      expect(DynamicApiEventRegistryStore.getCollisions()).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear both the registry and the collisions', () => {
      vi.spyOn(DynamicApiEventRegistryStore['logger'], 'warn').mockImplementation();

      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'User',
        displayedName: 'User',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });
      DynamicApiEventRegistryStore.register({
        event: 'shared-event',
        routeType: 'CreateOne',
        entityName: 'Company',
        displayedName: 'Company',
        channel: 'http',
        hasRoomTargeting: false,
        hasAbilityPredicate: false,
        isCustomEventName: false,
      });

      DynamicApiEventRegistryStore.reset();

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([]);
      expect(DynamicApiEventRegistryStore.getCollisions()).toEqual([]);
    });
  });
});
