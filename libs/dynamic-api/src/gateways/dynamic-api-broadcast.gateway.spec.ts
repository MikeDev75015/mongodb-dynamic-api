import { createMock } from '@golevelup/ts-jest';
import { Server } from 'socket.io';
import { DynamicAPIWsExceptionFilter } from '../filters';
import { JwtSocketGuard } from '../guards';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { ExtendedSocket } from '../interfaces';
import { DynamicApiBroadcastService } from '../services';
import { createDynamicApiBroadcastGateway } from './dynamic-api-broadcast.gateway';

describe('createDynamicApiBroadcastGateway', () => {
  let mockBroadcastService: jest.Mocked<DynamicApiBroadcastService>;

  beforeEach(() => {
    mockBroadcastService = createMock<DynamicApiBroadcastService>();
  });

  it('should return a class', () => {
    const GatewayClass = createDynamicApiBroadcastGateway();

    expect(GatewayClass).toBeDefined();
    expect(typeof GatewayClass).toBe('function');
  });

  it('should create a gateway instance with the provided broadcastService', () => {
    const GatewayClass = createDynamicApiBroadcastGateway();
    const gateway = new GatewayClass(mockBroadcastService);

    expect(gateway).toBeDefined();
    expect(gateway.broadcastService).toBe(mockBroadcastService);
  });

  it('should create a gateway with default empty options', () => {
    const GatewayClass = createDynamicApiBroadcastGateway();
    const gateway = new GatewayClass(mockBroadcastService);

    expect(gateway).toBeInstanceOf(GatewayClass);
  });

  it('should create a gateway with custom options', () => {
    const GatewayClass = createDynamicApiBroadcastGateway({ namespace: '/broadcast', cors: { origin: '*' } });
    const gateway = new GatewayClass(mockBroadcastService);

    expect(gateway).toBeInstanceOf(GatewayClass);
  });

  describe('afterInit', () => {
    it('should call broadcastService.setWsServer with the provided server', () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const mockServer = {} as Server;

      gateway.afterInit(mockServer);

      expect(mockBroadcastService.setWsServer).toHaveBeenCalledTimes(1);
      expect(mockBroadcastService.setWsServer).toHaveBeenCalledWith(mockServer);
    });
  });

  describe('joinRooms', () => {
    it('should be protected by JwtSocketGuard', () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const guards: any[] = Reflect.getMetadata('__guards__', GatewayClass.prototype.joinRooms);

      expect(guards).toBeDefined();
      expect(guards.some((g) => g instanceof JwtSocketGuard)).toBe(true);
    });

    it('should use DynamicAPIWsExceptionFilter', () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const filters: any[] = Reflect.getMetadata('__exceptionFilters__', GatewayClass.prototype.joinRooms);

      expect(filters).toBeDefined();
      expect(filters.some((f) => f instanceof DynamicAPIWsExceptionFilter)).toBe(true);
    });

    it('should join a single room and return the room list', async () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const mockSocket = { join: jest.fn() } as unknown as ExtendedSocket;

      const result = await gateway.joinRooms(mockSocket, { rooms: 'room-a' });

      expect(mockSocket.join).toHaveBeenCalledWith('room-a');
      expect(result).toEqual({ event: 'join-rooms', data: ['room-a'] });
    });

    it('should join multiple rooms and return the room list', async () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const mockSocket = { join: jest.fn() } as unknown as ExtendedSocket;

      const result = await gateway.joinRooms(mockSocket, { rooms: ['room-a', 'room-b'] });

      expect(mockSocket.join).toHaveBeenCalledWith('room-a');
      expect(mockSocket.join).toHaveBeenCalledWith('room-b');
      expect(result).toEqual({ event: 'join-rooms', data: ['room-a', 'room-b'] });
    });
  });

  describe('leaveRooms', () => {
    it('should be protected by JwtSocketGuard', () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const guards: any[] = Reflect.getMetadata('__guards__', GatewayClass.prototype.leaveRooms);

      expect(guards).toBeDefined();
      expect(guards.some((g) => g instanceof JwtSocketGuard)).toBe(true);
    });

    it('should use DynamicAPIWsExceptionFilter', () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const filters: any[] = Reflect.getMetadata('__exceptionFilters__', GatewayClass.prototype.leaveRooms);

      expect(filters).toBeDefined();
      expect(filters.some((f) => f instanceof DynamicAPIWsExceptionFilter)).toBe(true);
    });

    it('should leave a single room and return the room list', async () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const mockSocket = { leave: jest.fn() } as unknown as ExtendedSocket;

      const result = await gateway.leaveRooms(mockSocket, { rooms: 'room-a' });

      expect(mockSocket.leave).toHaveBeenCalledWith('room-a');
      expect(result).toEqual({ event: 'leave-rooms', data: ['room-a'] });
    });

    it('should leave multiple rooms and return the room list', async () => {
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const mockSocket = { leave: jest.fn() } as unknown as ExtendedSocket;

      const result = await gateway.leaveRooms(mockSocket, { rooms: ['room-a', 'room-b'] });

      expect(mockSocket.leave).toHaveBeenCalledWith('room-a');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-b');
      expect(result).toEqual({ event: 'leave-rooms', data: ['room-a', 'room-b'] });
    });
  });

  describe('debug logging', () => {
    afterEach(() => {
      DynamicApiWsConfigStore.reset();
    });

    it('should log joinRooms when debug is true', () => {
      DynamicApiWsConfigStore.debug = true;
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const spyLog = jest.spyOn(gateway['logger'], 'log').mockImplementation(() => {});
      const mockSocket = { id: 'sock-1', join: jest.fn() } as unknown as ExtendedSocket;

      gateway.joinRooms(mockSocket, { rooms: ['room-x'] });

      expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining('[WS] joinRooms'),
      );
    });

    it('should log leaveRooms when debug is true', () => {
      DynamicApiWsConfigStore.debug = true;
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const spyLog = jest.spyOn(gateway['logger'], 'log').mockImplementation(() => {});
      const mockSocket = { id: 'sock-2', leave: jest.fn() } as unknown as ExtendedSocket;

      gateway.leaveRooms(mockSocket, { rooms: 'room-y' });

      expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining('[WS] leaveRooms'),
      );
    });

    it('should not log joinRooms when debug is false', () => {
      DynamicApiWsConfigStore.debug = false;
      const GatewayClass = createDynamicApiBroadcastGateway();
      const gateway = new GatewayClass(mockBroadcastService);
      const spyLog = jest.spyOn(gateway['logger'], 'log').mockImplementation(() => {});
      const mockSocket = { id: 'sock-3', join: jest.fn() } as unknown as ExtendedSocket;

      gateway.joinRooms(mockSocket, { rooms: ['room-x'] });

      expect(spyLog).not.toHaveBeenCalled();
    });
  });
});

