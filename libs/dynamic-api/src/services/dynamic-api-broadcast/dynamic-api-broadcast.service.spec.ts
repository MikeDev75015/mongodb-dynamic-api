import { Server } from 'socket.io';
import { DynamicApiBroadcastService } from './dynamic-api-broadcast.service';

describe('DynamicApiBroadcastService', () => {
  let service: DynamicApiBroadcastService;
  let mockServer: jest.Mocked<Pick<Server, 'emit'>>;

  beforeEach(() => {
    service = new DynamicApiBroadcastService();
    // Reset the static server before each test to avoid cross-test interference
    (DynamicApiBroadcastService as any).wsServer = null;
    mockServer = { emit: jest.fn() } as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setWsServer', () => {
    it('should set the static ws server', () => {
      service.setWsServer(mockServer as unknown as Server);

      expect((DynamicApiBroadcastService as any).wsServer).toBe(mockServer);
    });
  });

  describe('broadcastFromHttp', () => {
    describe('early returns', () => {
      it('should not emit when wsServer is null', () => {
        service.broadcastFromHttp('event', [{ id: '1' }], { enabled: true });

        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should not emit when broadcastConfig is null', () => {
        service.setWsServer(mockServer as unknown as Server);

        service.broadcastFromHttp('event', [{ id: '1' }], null as any);

        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should not emit when data is an empty array', () => {
        service.setWsServer(mockServer as unknown as Server);

        service.broadcastFromHttp('event', [], { enabled: true });

        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should not emit when enabled is false', () => {
        service.setWsServer(mockServer as unknown as Server);

        service.broadcastFromHttp('event', [{ id: '1' }], { enabled: false });

        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should not emit when predicate filters out all items', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1', role: 'user' }, { id: '2', role: 'user' }];

        service.broadcastFromHttp('event', data, {
          enabled: (item: any) => item.role === 'admin',
        });

        expect(mockServer.emit).not.toHaveBeenCalled();
      });
    });

    describe('emit cases', () => {
      it('should emit with the event name when enabled is true', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('my-event', data);
      });

      it('should emit with custom eventName when provided and enabled is true', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true, eventName: 'custom-event' });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('custom-event', data);
      });

      it('should emit only items matching the predicate', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [
          { id: '1', role: 'admin' },
          { id: '2', role: 'user' },
          { id: '3', role: 'admin' },
        ];

        service.broadcastFromHttp('my-event', data, {
          enabled: (item: any) => item.role === 'admin',
        });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('my-event', [
          { id: '1', role: 'admin' },
          { id: '3', role: 'admin' },
        ]);
      });

      it('should emit with custom eventName when predicate matches', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1', role: 'admin' }];

        service.broadcastFromHttp('my-event', data, {
          enabled: (item: any) => item.role === 'admin',
          eventName: 'admin-event',
        });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('admin-event', [{ id: '1', role: 'admin' }]);
      });
    });
  });
});

