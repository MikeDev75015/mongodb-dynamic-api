import { createMock } from '@golevelup/ts-jest';
import { Server } from 'socket.io';
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
});

