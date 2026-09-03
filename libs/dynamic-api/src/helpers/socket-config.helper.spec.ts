import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { INestApplication } from '@nestjs/common';
import * as Adapter from '../adapters/socket-adapter';
import { GatewayOptions } from '../interfaces';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { DynamicApiEventRegistryStore } from './event-registry.store';
import { enableDynamicAPIWebSockets, initializeConfigFromOptions } from './socket-config.helper';
import { DynamicApiWsConfigStore } from './ws-config.store';

vi.mock('../adapters/socket-adapter', () => ({
  SocketAdapter: vi.fn(),
}));

vi.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: vi.fn().mockReturnValue('test-jwt-secret') } },
}));

describe('SocketConfigHelper', () => {
  let spySocketAdapter: Mock;

  const fakeApp = {
    useWebSocketAdapter: vi.fn(),
  } as unknown as INestApplication;

  beforeEach(() => {
    spySocketAdapter = vi.spyOn(Adapter, 'SocketAdapter');
    DynamicApiWsConfigStore.reset();
    DynamicApiEventRegistryStore.reset();
    vi.clearAllMocks();
  });

  describe('enableDynamicAPIWebSockets', () => {
    it('should call app.useWebSocketAdapter with no options', () => {
      enableDynamicAPIWebSockets(fakeApp);

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(spySocketAdapter).toHaveBeenCalledTimes(1);
      expect(spySocketAdapter).toHaveBeenCalledWith(fakeApp);
      expect(DynamicApiWsConfigStore.debug).toBe(false);
      expect(DynamicApiWsConfigStore.onConnection).toBeUndefined();
    });

    it('should accept an options object and populate the config store', () => {
      const onConnection = vi.fn();
      enableDynamicAPIWebSockets(fakeApp, { maxListeners: 20, onConnection, debug: true });

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(DynamicApiWsConfigStore.debug).toBe(true);
      expect(DynamicApiWsConfigStore.onConnection).toBe(onConnection);
      expect(DynamicApiWsConfigStore.jwtSecret).toBe('test-jwt-secret');
      expect(DynamicApiWsConfigStore.customEvents).toEqual([]);
    });

    it('should populate customEvents in the config store', () => {
      const handler = vi.fn();
      const customEvents = [
        { name: 'voice-call', handler },
        { name: 'admin-action', predicate: vi.fn(), handler },
      ];

      enableDynamicAPIWebSockets(fakeApp, { customEvents });

      expect(DynamicApiWsConfigStore.customEvents).toBe(customEvents);
    });

    it('should default customEvents to empty array when not provided', () => {
      enableDynamicAPIWebSockets(fakeApp);

      expect(DynamicApiWsConfigStore.customEvents).toEqual([]);
    });

    it('should throw on MaxListenersExceededWarning error', () => {
      const spyConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const fakeError = {
        name: 'MaxListenersExceededWarning',
      };

      spySocketAdapter.mockImplementationOnce(function () {
        process.emit('warning', fakeError as unknown as Error);
      });

      expect(() => enableDynamicAPIWebSockets(fakeApp, { maxListeners: 50 })).toThrow(
        'MaxListenersExceededWarning: too many listeners. Increase maxListeners via enableDynamicAPIWebSockets(app, { maxListeners: <value> }).',
      );

      expect(spyConsoleWarn).toHaveBeenCalledWith(
        '\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners',
      );
      expect(spyConsoleWarn).toHaveBeenCalledWith(
        '>>> enableDynamicAPIWebSockets(app, { maxListeners: 15 });\n\n',
      );
    });

    describe('failOnEventCollision', () => {
      const registerCollision = () => {
        vi.spyOn(DynamicApiEventRegistryStore['logger'], 'warn').mockImplementation();

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
      };

      it('should throw when failOnEventCollision is true and a collision was registered', () => {
        registerCollision();

        expect(() => enableDynamicAPIWebSockets(fakeApp, { failOnEventCollision: true })).toThrow(
          /broadcast event name collision detected.*shared-event/,
        );
        expect(fakeApp.useWebSocketAdapter).not.toHaveBeenCalled();
      });

      it('should not throw when failOnEventCollision is true and there are no collisions', () => {
        expect(() => enableDynamicAPIWebSockets(fakeApp, { failOnEventCollision: true })).not.toThrow();
        expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      });

      it('should not throw when failOnEventCollision is not set, even if collisions exist', () => {
        registerCollision();

        expect(() => enableDynamicAPIWebSockets(fakeApp)).not.toThrow();
        expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('initializeConfigFromOptions', () => {
    it('should return empty object when options is undefined', () => {
      const result = initializeConfigFromOptions(undefined);

      expect(result).toBeUndefined();
    });

    it('should return empty object when options is null', () => {
      const result = initializeConfigFromOptions(null);

      expect(result).toBeUndefined();
    });

    it('should return undefined when options is the boolean false', () => {
      const result = initializeConfigFromOptions(false);

      expect(result).toBeUndefined();
    });

    it('should return empty object when options is the boolean true', () => {
      const result = initializeConfigFromOptions(true);

      expect(result).toEqual({});
    });

    it('should return options when options is valid', () => {
      const options: GatewayOptions = {
        path: '/test',
      };
      const result = initializeConfigFromOptions(options);

      expect(result).toEqual(options);
    });
  });
});
