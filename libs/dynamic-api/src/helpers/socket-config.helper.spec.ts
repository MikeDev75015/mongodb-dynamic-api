import { INestApplication } from '@nestjs/common';
import * as Adapter from '../adapters/socket-adapter';
import { GatewayOptions } from '../interfaces';
import { enableDynamicAPIWebSockets, initializeConfigFromOptions } from './socket-config.helper';

jest.mock('../adapters/socket-adapter', () => ({
  SocketAdapter: jest.fn(),
}));

describe('SocketConfigHelper', () => {
  let spySocketAdapter: jest.SpyInstance;

  const fakeApp = {
    useWebSocketAdapter: jest.fn(),
  } as unknown as INestApplication;

  beforeEach(() => {
    spySocketAdapter = jest.spyOn(Adapter, 'SocketAdapter');
  });

  describe('enableDynamicAPIWebSockets', () => {
    it('should call app.useWebSocketAdapter', () => {
      enableDynamicAPIWebSockets(fakeApp);

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(spySocketAdapter).toHaveBeenCalledTimes(1);
      expect(spySocketAdapter).toHaveBeenCalledWith(fakeApp);
    });

    it('should exit on MaxListenersExceededWarning error', () => {
      const spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const spyProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => ({}) as never);

      const fakeError = {
        name: 'MaxListenersExceededWarning',
      };

      spySocketAdapter.mockImplementationOnce(() => {
        process.emit('warning' as any, fakeError as any);
      });

      enableDynamicAPIWebSockets(fakeApp, 50);

      expect(fakeApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);
      expect(spyConsoleWarn).toHaveBeenNthCalledWith(1, '\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners');
      expect(spyConsoleWarn).toHaveBeenNthCalledWith(2, 'by passing the value to the enableDynamicAPIWebSockets function as the second argument:\n');
      expect(spyConsoleWarn).toHaveBeenNthCalledWith(3, '>>> enableDynamicAPIWebSockets(app, 15);\n\n');
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
