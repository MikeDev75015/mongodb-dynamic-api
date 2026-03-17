import { SocketAdapter } from './socket-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('SocketAdapter', () => {
  let adapter: SocketAdapter;
  let connectionHandler: (socket: any) => void;

  const fakeServer = {
    on: jest.fn((event: string, handler: any) => {
      if (event === 'connection') {
        connectionHandler = handler;
      }
    }),
  };

  beforeEach(() => {
    adapter = new SocketAdapter();
    jest.spyOn(IoAdapter.prototype, 'createIOServer').mockImplementation(() => fakeServer);
    DynamicApiWsConfigStore.reset();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(adapter).toBeTruthy();
  });

  describe('createIOServer', () => {
    it('should create a new server and register connection handler', () => {
      const server = adapter.createIOServer(5000);
      expect(server).toStrictEqual(fakeServer);
      expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should reuse the same server on subsequent calls', () => {
      const server1 = adapter.createIOServer(5000);
      const server2 = adapter.createIOServer(5000);
      expect(server1).toBe(server2);
      expect(IoAdapter.prototype.createIOServer).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleConnection (via connection event)', () => {
    beforeEach(() => {
      adapter.createIOServer(5000);
    });

    it('should decode JWT and set user on socket when jwtSecret is set', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ iat: 1, exp: 2, id: 'user-1', name: 'Test' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';

      const socket = {
        id: 'sock-1',
        handshake: { auth: { token: 'tok' }, query: {} },
      };

      connectionHandler(socket);

      expect(jwt.verify).toHaveBeenCalledWith('tok', 'secret');
      expect(socket['user']).toEqual({ id: 'user-1', name: 'Test' });
    });

    it('should not set user when no jwtSecret', () => {
      const socket = {
        id: 'sock-2',
        handshake: { auth: {}, query: {} },
      };

      connectionHandler(socket);

      expect(socket['user']).toBeUndefined();
    });

    it('should call onConnection hook if provided', () => {
      const onConnection = jest.fn();
      DynamicApiWsConfigStore.onConnection = onConnection;

      const socket = { id: 'sock-3', handshake: { auth: {}, query: {} } };

      connectionHandler(socket);

      expect(onConnection).toHaveBeenCalledWith(socket, undefined);
    });

    it('should call onConnection with user when JWT is valid', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ iat: 1, exp: 2, id: 'u1' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const onConnection = jest.fn();
      DynamicApiWsConfigStore.onConnection = onConnection;

      const socket = { id: 'sock-4', handshake: { auth: { token: 'tok' }, query: {} } };
      connectionHandler(socket);

      expect(onConnection).toHaveBeenCalledWith(socket, { id: 'u1' });
    });

    it('should log debug info when debug is true', () => {
      DynamicApiWsConfigStore.debug = true;
      const spyLog = jest.spyOn(adapter['logger'], 'log').mockImplementation(() => {});

      const socket = { id: 'sock-5', handshake: { auth: {}, query: {} } };
      connectionHandler(socket);

      expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining('[WS] connection'),
      );
    });

    it('should warn on JWT verification failure when debug is true', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => { throw new Error('bad token'); });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      DynamicApiWsConfigStore.debug = true;
      const spyWarn = jest.spyOn(adapter['logger'], 'warn').mockImplementation(() => {});

      const socket = { id: 'sock-6', handshake: { auth: { token: 'bad' }, query: {} } };
      connectionHandler(socket);

      expect(spyWarn).toHaveBeenCalledWith(
        expect.stringContaining('JWT verification failed'),
      );
    });

    it('should catch async onConnection errors', async () => {
      const error = new Error('hook error');
      DynamicApiWsConfigStore.onConnection = jest.fn().mockRejectedValue(error);
      const spyError = jest.spyOn(adapter['logger'], 'error').mockImplementation(() => {});

      const socket = { id: 'sock-7', handshake: { auth: {}, query: {} } };
      connectionHandler(socket);

      // Wait for the promise rejection to be handled
      await new Promise((r) => setTimeout(r, 10));

      expect(spyError).toHaveBeenCalledWith(
        expect.stringContaining('onConnection hook error'),
        expect.any(String),
      );
    });
  });
});
