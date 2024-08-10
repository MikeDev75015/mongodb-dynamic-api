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
