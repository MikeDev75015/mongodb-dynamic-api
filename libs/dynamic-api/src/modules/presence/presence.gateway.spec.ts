import { createPresenceGateway } from './presence.gateway';
import { DynamicApiWsConfigStore } from '../../helpers/ws-config.store';

describe('createPresenceGateway', () => {
  const mockPresenceAdapter = {
    setOnline: jest.fn(),
    setOffline: jest.fn(),
    getSocketCount: jest.fn(),
    isOnline: jest.fn(),
    getOnlineUserIds: jest.fn(),
  };

  let gateway: InstanceType<ReturnType<typeof createPresenceGateway>>;
  let mockServer: {
    on: jest.Mock;
    emit: jest.Mock;
  };
  let connectionHandler: (socket: Record<string, unknown>) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    DynamicApiWsConfigStore.reset();

    mockPresenceAdapter.setOnline.mockResolvedValue(undefined);
    mockPresenceAdapter.setOffline.mockResolvedValue(undefined);
    mockPresenceAdapter.getSocketCount.mockResolvedValue(0);

    mockServer = {
      on: jest.fn((event: string, handler: (s: Record<string, unknown>) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      emit: jest.fn(),
    };

    const GatewayClass = createPresenceGateway({});
    gateway = new GatewayClass(mockPresenceAdapter as never);
  });

  it('should create a gateway class', () => {
    expect(gateway).toBeTruthy();
  });

  it('should inject the DYNAMIC_API_PRESENCE_ADAPTER', () => {
    expect(gateway.presenceAdapter).toBe(mockPresenceAdapter);
  });

  describe('afterInit', () => {
    it('should register a connection listener on the server', () => {
      gateway.afterInit(mockServer as never);
      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('connection handling', () => {
    beforeEach(() => {
      gateway.afterInit(mockServer as never);
    });

    it('should call setOnline and emit user:online when an authenticated socket connects', async () => {
      const socket = {
        id: 'sock-1',
        user: { id: 'user-1' },
        on: jest.fn(),
      };

      gateway.onSocketConnection(mockServer as never, socket as never);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockPresenceAdapter.setOnline).toHaveBeenCalledWith('user-1', 'sock-1');
      expect(mockServer.emit).toHaveBeenCalledWith('user:online', { userId: 'user-1' });
    });

    it('should register a disconnect listener after setOnline resolves', async () => {
      const socket = {
        id: 'sock-1',
        user: { id: 'user-1' },
        on: jest.fn(),
      };

      gateway.onSocketConnection(mockServer as never, socket as never);
      await new Promise((r) => setTimeout(r, 10));

      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should silently ignore anonymous sockets (no user)', async () => {
      const socket = { id: 'sock-anon', on: jest.fn() };

      gateway.onSocketConnection(mockServer as never, socket as never);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockPresenceAdapter.setOnline).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log on connection when debug is enabled', async () => {
      DynamicApiWsConfigStore.debug = true;
      const spyLog = jest.spyOn(gateway.logger, 'log').mockImplementation(() => {});
      const socket = { id: 'sock-1', user: { id: 'user-1' }, on: jest.fn() };

      gateway.onSocketConnection(mockServer as never, socket as never);
      await new Promise((r) => setTimeout(r, 10));

      expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('user:online'));
    });
  });

  describe('disconnect handling (onSocketDisconnect)', () => {
    it('should call setOffline on disconnect', async () => {
      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      expect(mockPresenceAdapter.setOffline).toHaveBeenCalledWith('user-1', 'sock-1');
    });

    it('should emit user:offline when no sockets remain', async () => {
      mockPresenceAdapter.getSocketCount.mockResolvedValue(0);
      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      expect(mockServer.emit).toHaveBeenCalledWith('user:offline', { userId: 'user-1' });
    });

    it('should NOT emit user:offline when other sockets still exist (multi-tab)', async () => {
      mockPresenceAdapter.getSocketCount.mockResolvedValue(2);
      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      const offlineCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        ([event]) => event === 'user:offline',
      );
      expect(offlineCalls).toHaveLength(0);
    });

    it('should log on disconnect when debug is enabled', async () => {
      DynamicApiWsConfigStore.debug = true;
      const spyLog = jest.spyOn(gateway.logger, 'log').mockImplementation(() => {});
      mockPresenceAdapter.getSocketCount.mockResolvedValue(0);

      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('user:offline'));
    });

    it('should log error string when disconnect handler throws a non-Error value', async () => {
      mockPresenceAdapter.setOffline.mockRejectedValue('string-error');
      const spyError = jest.spyOn(gateway.logger, 'error').mockImplementation(() => {});

      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      expect(spyError).toHaveBeenCalledWith(expect.stringContaining('disconnect handler error'));
    });

    it('should log error when setOffline rejects with an Error instance', async () => {
      mockPresenceAdapter.setOffline.mockRejectedValue(new Error('redis down'));
      const spyError = jest.spyOn(gateway.logger, 'error').mockImplementation(() => {});

      gateway.onSocketDisconnect(mockServer as never, 'user-1', 'sock-1');
      await new Promise((r) => setTimeout(r, 10));

      expect(spyError).toHaveBeenCalledWith(expect.stringContaining('redis down'));
    });
  });

  describe('afterInit integration', () => {
    it('should call onSocketConnection when server emits a connection event', () => {
      gateway.afterInit(mockServer as never);
      const spyConnect = jest.spyOn(gateway, 'onSocketConnection').mockImplementation(() => {});

      const socket = { id: 'sock-x', user: { id: 'u-x' }, on: jest.fn() };
      connectionHandler(socket as never);

      expect(spyConnect).toHaveBeenCalledWith(mockServer, socket);
    });
  });

  describe('disconnect registration via onSocketConnection', () => {
    it('should register a disconnect listener that calls onSocketDisconnect', async () => {
      let disconnectCb: (() => void) | undefined;
      const socket = {
        id: 'sock-1',
        user: { id: 'user-1' },
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'disconnect') disconnectCb = cb;
        }),
      };

      gateway.afterInit(mockServer as never);
      gateway.onSocketConnection(mockServer as never, socket as never);
      await new Promise((r) => setTimeout(r, 10));

      expect(disconnectCb).toBeDefined();

      const spyDisconnect = jest.spyOn(gateway, 'onSocketDisconnect').mockImplementation(() => {});
      disconnectCb!();

      expect(spyDisconnect).toHaveBeenCalledWith(mockServer, 'user-1', 'sock-1');
    });
  });

  describe('createPresenceGateway with options', () => {
    it('should accept custom GatewayOptions without throwing', () => {
      expect(() => createPresenceGateway({ namespace: '/custom' })).not.toThrow();
    });

    it('should use empty object as default options (no arguments)', () => {
      expect(() => createPresenceGateway()).not.toThrow();
    });
  });
});









