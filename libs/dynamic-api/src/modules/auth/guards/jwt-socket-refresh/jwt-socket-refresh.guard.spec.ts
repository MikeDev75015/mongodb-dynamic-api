import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { DynamicApiModule } from '../../../../dynamic-api.module';
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

    it('should set socket.user and return true for valid token', async () => {
      const validPayload = { id: 'user-id', email: 'test@test.co' };
      const spyExtract = jest.spyOn<any, any>(guard as any, 'extractUserFromToken')
        .mockResolvedValueOnce(validPayload);

      const socket = { handshake: { query: { refreshToken: 'valid-token' } }, user: undefined };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(spyExtract).toHaveBeenCalledWith('valid-token');
      expect(result).toBe(true);
      expect((socket as any).user).toEqual(validPayload);
    });

    it('should throw WsException when user is empty after extraction', async () => {
      jest.spyOn<any, any>(guard as any, 'extractUserFromToken').mockResolvedValueOnce({});

      const socket = { handshake: { query: { refreshToken: 'valid-token' } }, user: undefined };
      const context = {
        getArgs: () => [socket],
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });
  });

  describe('getRefreshTokenFromSocket', () => {
    it('should return refreshToken from socket query', () => {
      const socket = { handshake: { query: { refreshToken: 'my-refresh-token' } } };
      const result = (guard as any).getRefreshTokenFromSocket(socket);
      expect(result).toBe('my-refresh-token');
    });

    it('should throw WsException when refreshToken is missing', () => {
      const socket = { handshake: { query: {} } };
      expect(() => (guard as any).getRefreshTokenFromSocket(socket)).toThrow(WsException);
    });
  });
});

