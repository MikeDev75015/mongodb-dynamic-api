import { INestApplication } from '@nestjs/common';
import * as Adapter from '../adapters/socket-adapter';
import { GatewayOptions } from '../interfaces';
import { enableDynamicAPIWebSockets, initializeConfigFromOptions } from './socket-config.helper';
import { DynamicApiWsConfigStore } from './ws-config.store';

jest.mock('../adapters/socket-adapter', () => ({
  SocketAdapter: jest.fn(),
}));

jest.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: jest.fn().mockReturnValue('test-jwt-secret') } },
}));

describe('SocketConfigHelper', () => {
  let spySocketAdapter: jest.SpyInstance;

  const fakeApp = {
    useWebSocketAdapter: jest.fn(),
  } as unknown as INestApplication;

  beforeEach(() => {
    spySocketAdapter = jest.spyOn(Adapter, 'SocketAdapter');
    DynamicApiWsConfigStore.reset();
    jest.clearAllMocks();
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
      const onConnection = jest.fn();
      enableDynamicAPIWebSockets(fakeApp, { maxListeners: 20, onConnection, debug: true });

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(DynamicApiWsConfigStore.debug).toBe(true);
      expect(DynamicApiWsConfigStore.onConnection).toBe(onConnection);
      expect(DynamicApiWsConfigStore.jwtSecret).toBe('test-jwt-secret');
    });

    it('should accept a number (deprecated) and warn', () => {
      const spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      enableDynamicAPIWebSockets(fakeApp, 50);

      expect(spyConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Passing a number to enableDynamicAPIWebSockets is deprecated'),
      );
      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    });

    it('should exit on MaxListenersExceededWarning error', () => {
      const spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const spyProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => ({}) as never);

      const fakeError = {
        name: 'MaxListenersExceededWarning',
      };

      spySocketAdapter.mockImplementationOnce(() => {
        process.emit('warning', fakeError as unknown as Error);
      });

      enableDynamicAPIWebSockets(fakeApp, { maxListeners: 50 });

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(spyConsoleWarn).toHaveBeenCalledWith(
        '\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners',
      );
      expect(spyConsoleWarn).toHaveBeenCalledWith(
        '>>> enableDynamicAPIWebSockets(app, { maxListeners: 15 });\n\n',
      );
      expect(spyProcessExit).toHaveBeenNthCalledWith(1, 1);
    });
  });

  describe('initializeConfigFromOptions', () => {
    it('should return empty object when options is undefined', () => {
      const result = initializeConfigFromOptions(undefined);

      expect(result).toEqual(undefined);
    });

    it('should return empty object when options is null', () => {
      const result = initializeConfigFromOptions(null);

      expect(result).toEqual(undefined);
    });

    it('should return empty object when options is boolean', () => {
      const result = initializeConfigFromOptions(false);

      expect(result).toEqual(undefined);
    });

    it('should return empty object when options is boolean', () => {
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
