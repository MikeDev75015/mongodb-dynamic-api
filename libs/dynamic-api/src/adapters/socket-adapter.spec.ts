import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { SocketAdapter } from './socket-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as jwt from 'jsonwebtoken';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';

vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
}));

describe('SocketAdapter', () => {
  let adapter: SocketAdapter;
  let connectionHandler: (socket: any) => void;
  let middleware: (socket: any, next: (err?: Error) => void) => void;

  const fakeServer = {
    on: vi.fn((event: string, handler: any) => {
      if (event === 'connection') {
        connectionHandler = handler;
      }
    }),
    use: vi.fn((fn: any) => {
      middleware = fn;
    }),
  };

  beforeEach(() => {
    adapter = new SocketAdapter();
    vi.spyOn(IoAdapter.prototype, 'createIOServer').mockImplementation(() => fakeServer);
    DynamicApiWsConfigStore.reset();
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(adapter).toBeTruthy();
  });

  describe('createIOServer', () => {
    it('should create a new server and register connection handler', () => {
      const server = adapter.createIOServer(5000);
      expect(server).toStrictEqual(fakeServer);
      expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(fakeServer.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should allow any origin when no cors option is given', () => {
      adapter.createIOServer(5000);
      expect(IoAdapter.prototype.createIOServer).toHaveBeenCalledWith(5000, { cors: { origin: '*' } });
    });

    it('should keep the cors option given by the gateway options', () => {
      const cors = { origin: ['https://app.example.com'], credentials: true };
      adapter.createIOServer(5000, { cors } as never);
      expect(IoAdapter.prototype.createIOServer).toHaveBeenCalledWith(5000, { cors });
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
      (jwt.verify as Mock).mockReturnValue({ iat: 1, exp: 2, typ: 'access', id: 'user-1', name: 'Test' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';

      const socket = {
        id: 'sock-1',
        handshake: { auth: { token: 'tok' }, query: {} },
      };

      connectionHandler(socket);

      expect(jwt.verify).toHaveBeenCalledWith('tok', 'secret');
      expect(socket['user']).toEqual({ id: 'user-1', name: 'Test' });
    });

    it('should treat a refresh token as an invalid handshake token', () => {
      (jwt.verify as Mock).mockReturnValue({ iat: 1, exp: 2, typ: 'refresh', id: 'user-1' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const socket = { id: 'sock-r', handshake: { auth: { token: 'refresh-tok' }, query: {} }, emit: vi.fn() };

      connectionHandler(socket);

      expect(socket['user']).toBeUndefined();
      expect(socket.emit).toHaveBeenCalledWith('unauthorized', { reason: 'invalid-token', message: 'invalid token type' });
    });

    it('should strip the typ claim from the socket user', () => {
      (jwt.verify as Mock).mockReturnValue({ iat: 1, exp: 2, typ: 'access', id: 'user-1' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const socket = { id: 'sock-a', handshake: { auth: { token: 'tok' }, query: {} } };

      connectionHandler(socket);

      expect(socket['user']).toEqual({ id: 'user-1' });
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
      const onConnection = vi.fn();
      DynamicApiWsConfigStore.onConnection = onConnection;

      const socket = { id: 'sock-3', handshake: { auth: {}, query: {} } };

      connectionHandler(socket);

      expect(onConnection).toHaveBeenCalledWith(socket, undefined);
    });

    it('should call onConnection with user when JWT is valid', () => {
      (jwt.verify as Mock).mockReturnValue({ iat: 1, exp: 2, typ: 'access', id: 'u1' });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const onConnection = vi.fn();
      DynamicApiWsConfigStore.onConnection = onConnection;

      const socket = { id: 'sock-4', handshake: { auth: { token: 'tok' }, query: {} } };
      connectionHandler(socket);

      expect(onConnection).toHaveBeenCalledWith(socket, { id: 'u1' });
    });

    it('should log debug info when debug is true', () => {
      DynamicApiWsConfigStore.debug = true;
      const spyLog = vi.spyOn(adapter['logger'], 'log').mockImplementation(() => {});

      const socket = { id: 'sock-5', handshake: { auth: {}, query: {} } };
      connectionHandler(socket);

      expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining('[WS] connection'),
      );
    });

    it('should warn on JWT verification failure when debug is true', () => {
      (jwt.verify as Mock).mockImplementation(() => { throw new Error('bad token'); });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      DynamicApiWsConfigStore.debug = true;
      const spyWarn = vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => {});

      const socket = { id: 'sock-6', handshake: { auth: { token: 'bad' }, query: {} }, emit: vi.fn() };
      connectionHandler(socket);

      expect(spyWarn).toHaveBeenCalledWith(
        expect.stringContaining('JWT verification failed'),
      );
    });

    it.each([
      ['an Error', new Error('jwt expired'), 'jwt expired'],
      ['a non-Error value', 'malformed', 'malformed'],
    ])('should emit unauthorized and connect anonymously when verification throws %s', (_, thrown, message) => {
      (jwt.verify as Mock).mockImplementation(() => { throw thrown; });
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const spyWarn = vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => {});
      const onConnection = vi.fn();
      DynamicApiWsConfigStore.onConnection = onConnection;

      const socket = { id: 'sock-6b', handshake: { auth: { token: 'expired' }, query: {} }, emit: vi.fn() };
      connectionHandler(socket);

      expect(socket.emit).toHaveBeenCalledWith('unauthorized', { reason: 'invalid-token', message });
      expect(socket.emit.mock.invocationCallOrder[0]).toBeLessThan(onConnection.mock.invocationCallOrder[0]);
      expect(onConnection).toHaveBeenCalledWith(socket, undefined);
      expect(socket['user']).toBeUndefined();
      expect(spyWarn).not.toHaveBeenCalled();
    });

    it('should not emit unauthorized when no token is provided', () => {
      DynamicApiWsConfigStore.jwtSecret = 'secret';
      const socket = { id: 'sock-6c', handshake: { auth: {}, query: {} }, emit: vi.fn() };

      connectionHandler(socket);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should catch async onConnection errors', async () => {
      const error = new Error('hook error');
      DynamicApiWsConfigStore.onConnection = vi.fn().mockRejectedValue(error);
      const spyError = vi.spyOn(adapter['logger'], 'error').mockImplementation(() => {});

      const socket = { id: 'sock-7', handshake: { auth: {}, query: {} } };
      connectionHandler(socket);

      // Wait for the promise rejection to be handled
      await new Promise((r) => setTimeout(r, 10));

      expect(spyError).toHaveBeenCalledWith(
        expect.stringContaining('onConnection hook error'),
        expect.any(String),
      );
    });

    it('should log non-Error onConnection rejections without a stack', async () => {
      DynamicApiWsConfigStore.onConnection = vi.fn().mockRejectedValue('plain failure');
      const spyError = vi.spyOn(adapter['logger'], 'error').mockImplementation(() => {});

      connectionHandler({ id: 'sock-7b', handshake: { auth: {}, query: {} } });
      await new Promise((r) => setTimeout(r, 10));

      expect(spyError).toHaveBeenCalledWith('onConnection hook error for socket sock-7b: plain failure', undefined);
    });

    describe('customEvents', () => {
      it('registers socket.on for each customEvent on connection', () => {
        const handler = vi.fn();
        const eventSocket = {
          id: 'sock-ev',
          handshake: { auth: {}, query: {} },
          on: vi.fn(),
        };

        DynamicApiWsConfigStore.customEvents = [
          { name: 'voice-call', handler },
          { name: 'admin-action', handler },
        ];

        connectionHandler(eventSocket);

        expect(eventSocket.on).toHaveBeenCalledTimes(2);
        expect(eventSocket.on).toHaveBeenCalledWith('voice-call', expect.any(Function));
        expect(eventSocket.on).toHaveBeenCalledWith('admin-action', expect.any(Function));
      });

      it('calls the event handler with payload and user', () => {
        const handler = vi.fn();
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-ev2',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'test-event', handler }];

        connectionHandler(eventSocket);
        capturedListener!({ data: 'hello' });

        expect(handler).toHaveBeenCalledWith(eventSocket, { data: 'hello' }, undefined);
      });

      it('blocks the event handler when predicate returns false', () => {
        const handler = vi.fn();
        const predicate = vi.fn().mockReturnValue(false);
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-pred',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'restricted', handler, predicate }];

        connectionHandler(eventSocket);
        capturedListener!({ data: 'blocked' });

        expect(predicate).toHaveBeenCalledWith(undefined);
        expect(handler).not.toHaveBeenCalled();
      });

      it('calls the event handler when predicate returns true', () => {
        const handler = vi.fn();
        const predicate = vi.fn().mockReturnValue(true);
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-pred2',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'allowed', handler, predicate }];

        connectionHandler(eventSocket);
        capturedListener!({ data: 'ok' });

        expect(handler).toHaveBeenCalledWith(eventSocket, { data: 'ok' }, undefined);
      });

      it('catches async custom event handler errors', async () => {
        const error = new Error('event error');
        const handler = vi.fn().mockRejectedValue(error);
        const spyError = vi.spyOn(adapter['logger'], 'error').mockImplementation(() => {});
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-err',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'failing-event', handler }];

        connectionHandler(eventSocket);
        capturedListener!({});

        await new Promise((r) => setTimeout(r, 10));

        expect(spyError).toHaveBeenCalledWith(
          expect.stringContaining("customEvent 'failing-event' handler error"),
          expect.any(String),
        );
      });

      it('logs non-Error custom event handler rejections without a stack', async () => {
        const handler = vi.fn().mockRejectedValue('plain failure');
        const spyError = vi.spyOn(adapter['logger'], 'error').mockImplementation(() => {});
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-err2',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'failing-event', handler }];

        connectionHandler(eventSocket);
        capturedListener!({});
        await new Promise((r) => setTimeout(r, 10));

        expect(spyError).toHaveBeenCalledWith(
          "customEvent 'failing-event' handler error for socket sock-err2: plain failure",
          undefined,
        );
      });

      it('logs debug warning when predicate blocks event and debug is true', () => {
        DynamicApiWsConfigStore.debug = true;
        const spyWarn = vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => {});
        const handler = vi.fn();
        const predicate = vi.fn().mockReturnValue(false);
        let capturedListener: ((payload: unknown) => void) | undefined;

        const eventSocket = {
          id: 'sock-dbg',
          handshake: { auth: {}, query: {} },
          on: vi.fn((_name: string, listener: (payload: unknown) => void) => {
            capturedListener = listener;
          }),
        };

        DynamicApiWsConfigStore.customEvents = [{ name: 'guarded', handler, predicate }];

        connectionHandler(eventSocket);
        capturedListener!({});

        expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('blocked by predicate'));
      });
    });
  });

  describe('rejectInvalidToken middleware', () => {
    beforeEach(() => {
      adapter.createIOServer(5000);
      DynamicApiWsConfigStore.jwtSecret = 'secret';
    });

    it('should let every socket through when rejectInvalidToken is false', () => {
      const next = vi.fn();

      middleware({ id: 'mw-1', handshake: { auth: { token: 'bad' } } }, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it.each([
      ['no token is provided', { auth: {} }, undefined],
      ['the token is valid', { auth: { token: 'tok' } }, { iat: 1, exp: 2, typ: 'access', id: 'u1' }],
    ])('should accept the socket when %s', (_, handshake, decoded) => {
      DynamicApiWsConfigStore.rejectInvalidToken = true;
      (jwt.verify as Mock).mockReturnValue(decoded);
      const next = vi.fn();

      middleware({ id: 'mw-2', handshake }, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept the socket when no jwtSecret is configured', () => {
      DynamicApiWsConfigStore.rejectInvalidToken = true;
      DynamicApiWsConfigStore.jwtSecret = undefined;
      const next = vi.fn();

      middleware({ id: 'mw-3', handshake: { auth: { token: 'tok' } } }, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it.each([false, true])('should refuse the socket with an Unauthorized error when the token is invalid (debug=%s)', (debug) => {
      DynamicApiWsConfigStore.rejectInvalidToken = true;
      DynamicApiWsConfigStore.debug = debug;
      (jwt.verify as Mock).mockImplementation(() => { throw new Error('jwt expired'); });
      const spyWarn = vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => {});
      const next = vi.fn();

      middleware({ id: 'mw-4', handshake: { auth: { token: 'expired' } } }, next);

      expect(next).toHaveBeenCalledWith(new Error('Unauthorized: jwt expired'));
      expect(spyWarn).toHaveBeenCalledTimes(debug ? 1 : 0);
    });
  });
});
