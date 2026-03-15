import { Server } from 'socket.io';
import { DynamicApiBroadcastConfig } from '../../interfaces';
import { DynamicApiBroadcastService } from './dynamic-api-broadcast.service';

describe('DynamicApiBroadcastService', () => {
  let service: DynamicApiBroadcastService;
  let mockToEmit: jest.Mock;
  let mockServer: jest.Mocked<Pick<Server, 'emit' | 'to'>>;

  beforeEach(() => {
    service = new DynamicApiBroadcastService();
    // Reset the static server before each test to avoid cross-test interference
    (DynamicApiBroadcastService as unknown as { wsServer: Server | null }).wsServer = null;
    mockToEmit = jest.fn();
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: mockToEmit }),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setWsServer', () => {
    it('should set the static ws server', () => {
      service.setWsServer(mockServer as unknown as Server);

      expect((DynamicApiBroadcastService as unknown as { wsServer: Server | null }).wsServer).toBe(mockServer);
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

        service.broadcastFromHttp('event', [{ id: '1' }], null as unknown as DynamicApiBroadcastConfig<{ id: string }>);

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
          enabled: (item: { id: string; role: string }) => item.role === 'admin',
        });

        expect(mockServer.emit).not.toHaveBeenCalled();
      });
    });

    describe('emit cases (no rooms → server.emit)', () => {
      it('should emit with the event name when enabled is true', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('my-event', data);
        expect(mockServer.to).not.toHaveBeenCalled();
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
          enabled: (item: { id: string; role: string }) => item.role === 'admin',
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
          enabled: (item: { id: string; role: string }) => item.role === 'admin',
          eventName: 'admin-event',
        });

        expect(mockServer.emit).toHaveBeenCalledTimes(1);
        expect(mockServer.emit).toHaveBeenCalledWith('admin-event', [{ id: '1', role: 'admin' }]);
      });
    });

    describe('emit cases with rooms → server.to()', () => {
      it('should emit to a static string room', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true, rooms: 'room-a' });

        expect(mockServer.to).toHaveBeenCalledWith(['room-a']);
        expect(mockToEmit).toHaveBeenCalledWith('my-event', data);
        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should emit to multiple static rooms', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true, rooms: ['room-a', 'room-b'] });

        expect(mockServer.to).toHaveBeenCalledWith(['room-a', 'room-b']);
        expect(mockToEmit).toHaveBeenCalledWith('my-event', data);
        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should resolve dynamic rooms from entity data and deduplicate', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [
          { id: '1', companyId: 'c1' },
          { id: '2', companyId: 'c1' },
          { id: '3', companyId: 'c2' },
        ];

        service.broadcastFromHttp('my-event', data, {
          enabled: true,
          rooms: (item: { id: string; companyId: string }) => item.companyId,
        });

        expect(mockServer.to).toHaveBeenCalledWith(['c1', 'c2']);
        expect(mockToEmit).toHaveBeenCalledWith('my-event', data);
        expect(mockServer.emit).not.toHaveBeenCalled();
      });

      it('should use custom eventName when emitting to rooms', () => {
        service.setWsServer(mockServer as unknown as Server);
        const data = [{ id: '1' }];

        service.broadcastFromHttp('my-event', data, { enabled: true, rooms: 'room-a', eventName: 'custom-event' });

        expect(mockServer.to).toHaveBeenCalledWith(['room-a']);
        expect(mockToEmit).toHaveBeenCalledWith('custom-event', data);
      });
    });
  });
});


