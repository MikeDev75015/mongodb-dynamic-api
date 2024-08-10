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
});
