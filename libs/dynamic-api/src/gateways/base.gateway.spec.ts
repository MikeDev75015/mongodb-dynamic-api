import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { DynamicApiModule } from '../dynamic-api.module';
import { ExtendedSocket } from '../interfaces';
import { BaseEntity } from '../models';
import { BaseGateway } from './base.gateway';

class Entity extends BaseEntity {
  name: string;
}

class TestGateway extends BaseGateway<Entity> {
  constructor(protected readonly jwtService: JwtService) {
    super(jwtService);
  }
}

describe('BaseGateway', () => {
  let gateway: TestGateway;
  let socket: ExtendedSocket<Entity>;

  const jwtService = createMock<JwtService>();
  const accessToken = 'accessToken';

  beforeEach(() => {
    gateway = new TestGateway(jwtService);
    socket = {
      handshake: {
        query: {},
      },
    } as ExtendedSocket<Entity>;
  });

  it('should be defined and have a logger', () => {
    expect(gateway).toBeDefined();
    expect(gateway['logger']).toBeDefined();
  });

  describe('addUserToSocket', () => {
    it('should not throw an exception if isAuthEnabled is false', () => {
      const isPublic = false;
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false);

      expect(() => gateway['addUserToSocket'](socket, isPublic)).not.toThrow();
    });

    it('should not throw an exception if isPublic is true', () => {
      const isPublic = true;
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);

      expect(() => gateway['addUserToSocket'](socket, isPublic)).not.toThrow();
    });

    it('should throw an exception and warn if the access token is invalid', () => {
      socket.handshake.query = { accessToken };
      const isPublic = false;
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('verify error');
      });
      const spyLoggerWarn = jest.spyOn(gateway['logger'], 'warn');
      const spyLoggerError = jest.spyOn(gateway['logger'], 'error');


      expect(() => gateway['addUserToSocket'](socket, isPublic)).toThrow(new WsException('Unauthorized'));

      expect(spyLoggerWarn).toHaveBeenCalledTimes(1);
      expect(spyLoggerWarn).toHaveBeenCalledWith('Invalid access token');
      expect(spyLoggerError).toHaveBeenCalledTimes(1);
      expect(spyLoggerError).toHaveBeenCalledWith('verify error', expect.any(String));
    });

    it('should throw an exception if the user is not valid', () => {
      socket.handshake.query = { accessToken };
      const isPublic = false;
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 1000,
      });

      expect(() => gateway['addUserToSocket'](socket, isPublic)).toThrow(new WsException('Unauthorized'));
    });

    it('should set the user to the socket if the user is valid', () => {
      socket.handshake.query = { accessToken };
      const isPublic = false;
      const fakeUser = { id: 'id', name: 'name' };
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 1000,
        ...fakeUser,
      });

      gateway['addUserToSocket'](socket, isPublic);

      expect(socket.user).toEqual(fakeUser);
    });
  });

  describe('isValidManyBody', () => {
    it('should return true if the body is valid', () => {
      const body = {
        ids: ['1', '2', '3'],
      };

      expect(gateway['isValidManyBody'](body)).toBe(true);
    });

    it('should return false if the body is invalid', () => {
      const body = {
        ids: '1',
      };

      expect(gateway['isValidManyBody'](body)).toBe(false);
    });
  });

  describe('broadcastIfNeeded', () => {
    let mockSocket: ExtendedSocket<Entity>;
    const event = 'test-event';

    beforeEach(() => {
      mockSocket = {
        user: { id: '123', name: 'Test User' } as Entity,
        broadcast: {
          emit: jest.fn(),
        },
      } as any;
    });

    it('should not broadcast if broadcastConfig is undefined', () => {
      const data = [{ id: '1', name: 'Entity 1' } as Entity];

      gateway['broadcastIfNeeded'](mockSocket, event, data, undefined);

      expect(mockSocket.broadcast.emit).not.toHaveBeenCalled();
    });

    it('should not broadcast if enabled is false', () => {
      const data = [{ id: '1', name: 'Entity 1' } as Entity];
      const broadcastConfig = {
        enabled: false,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).not.toHaveBeenCalled();
    });

    it('should broadcast all data if enabled is true', () => {
      const data = [
        { id: '1', name: 'Entity 1' } as Entity,
        { id: '2', name: 'Entity 2' } as Entity,
      ];
      const broadcastConfig = {
        enabled: true,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(event, data);
    });

    it('should broadcast with custom eventName if provided', () => {
      const data = [{ id: '1', name: 'Entity 1' } as Entity];
      const customEvent = 'custom-event';
      const broadcastConfig = {
        enabled: true,
        eventName: customEvent,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(customEvent, data);
    });

    it('should filter data using AbilityPredicate when enabled is a function', () => {
      const data = [
        { id: '1', name: 'Entity 1', status: 'published' } as Entity & { status: string },
        { id: '2', name: 'Entity 2', status: 'draft' } as Entity & { status: string },
        { id: '3', name: 'Entity 3', status: 'published' } as Entity & { status: string },
      ];
      const broadcastConfig = {
        enabled: (entity: Entity & { status: string }) => entity.status === 'published',
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(event, [
        data[0],
        data[2],
      ]);
    });

    it('should not broadcast if AbilityPredicate filters out all entities', () => {
      const data = [
        { id: '1', name: 'Entity 1', status: 'draft' } as Entity & { status: string },
        { id: '2', name: 'Entity 2', status: 'draft' } as Entity & { status: string },
      ];
      const broadcastConfig = {
        enabled: (entity: Entity & { status: string }) => entity.status === 'published',
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).not.toHaveBeenCalled();
    });

    it('should pass user to AbilityPredicate for permission checks', () => {
      const data = [{ id: '1', name: 'Entity 1' } as Entity];
      const abilityPredicate = jest.fn().mockReturnValue(true);
      const broadcastConfig = {
        enabled: abilityPredicate,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(abilityPredicate).toHaveBeenCalledTimes(1);
      expect(abilityPredicate).toHaveBeenCalledWith(data[0], mockSocket.user);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(event, data);
    });

    it('should broadcast empty array result when no data provided and enabled is true', () => {
      const data: Entity[] = [];
      const broadcastConfig = {
        enabled: true,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).not.toHaveBeenCalled();
    });

    it('should combine custom eventName with AbilityPredicate filtering', () => {
      const data = [
        { id: '1', name: 'Entity 1', isPublic: true } as Entity & { isPublic: boolean },
        { id: '2', name: 'Entity 2', isPublic: false } as Entity & { isPublic: boolean },
        { id: '3', name: 'Entity 3', isPublic: true } as Entity & { isPublic: boolean },
      ];
      const customEvent = 'public-entities-updated';
      const broadcastConfig = {
        enabled: (entity: Entity & { isPublic: boolean }) => entity.isPublic,
        eventName: customEvent,
      };

      gateway['broadcastIfNeeded'](mockSocket, event, data, broadcastConfig);

      expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(customEvent, [
        data[0],
        data[2],
      ]);
    });
  });
});
