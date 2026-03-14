import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { DynamicApiModule } from '../../../../dynamic-api.module';
import { ExtendedSocket } from '../../../../interfaces';
import { JwtSocketRefreshGuard } from './jwt-socket-refresh.guard';

describe('JwtSocketRefreshGuard', () => {
  let guard: JwtSocketRefreshGuard;

  beforeEach(() => {
    DynamicApiModule.state.set(['partial', {
      jwtSecret: 'access-secret',
      jwtRefreshSecret: 'refresh-secret',
    }]);
    guard = new JwtSocketRefreshGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw WsException when no refreshToken in query', async () => {
      const socket = { handshake: { query: {} }, user: undefined };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should throw WsException when refresh token is invalid', async () => {
      const socket = { handshake: { query: { refreshToken: 'invalid-token' } }, user: undefined };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should throw WsException when extracted user is empty (payload with no extra fields)', async () => {
      const secret = 'refresh-secret';
      const jwtService = new JwtService({ secret });
      const emptyPayloadToken = jwtService.sign({});

      const socket = { handshake: { query: { refreshToken: emptyPayloadToken } }, user: undefined };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should set socket.user and return true for a valid JWT token with user data', async () => {
      const secret = 'refresh-secret';
      const jwtService = new JwtService({ secret });
      const validToken = jwtService.sign({ id: 'user-id', email: 'test@test.co' });

      const socket: { handshake: { query: Record<string, string> }; user: unknown } = {
        handshake: { query: { refreshToken: validToken } },
        user: undefined,
      };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(socket.user).toEqual(expect.objectContaining({ id: 'user-id', email: 'test@test.co' }));
    });

    it('should use jwtSecret as fallback when jwtRefreshSecret is undefined', async () => {
      DynamicApiModule.state.set(['partial', {
        jwtSecret: 'access-secret',
        jwtRefreshSecret: undefined,
      }]);
      guard = new JwtSocketRefreshGuard();

      const jwtService = new JwtService({ secret: 'access-secret' });
      const validToken = jwtService.sign({ id: 'user-id', email: 'test@test.co' });

      const socket: { handshake: { query: Record<string, string> }; user: unknown } = {
        handshake: { query: { refreshToken: validToken } },
        user: undefined,
      };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(socket.user).toEqual(expect.objectContaining({ id: 'user-id', email: 'test@test.co' }));
    });
  });

  describe('getRefreshTokenFromSocket', () => {
    it('should return refreshToken from socket query', () => {
      const socket = { handshake: { query: { refreshToken: 'my-refresh-token' } } };
      const result = guard['getRefreshTokenFromSocket'](socket as unknown as ExtendedSocket);
      expect(result).toBe('my-refresh-token');
    });

    it('should throw WsException when refreshToken is missing', () => {
      const socket = { handshake: { query: {} } };
      expect(() => guard['getRefreshTokenFromSocket'](socket as unknown as ExtendedSocket)).toThrow(WsException);
    });
  });
});

