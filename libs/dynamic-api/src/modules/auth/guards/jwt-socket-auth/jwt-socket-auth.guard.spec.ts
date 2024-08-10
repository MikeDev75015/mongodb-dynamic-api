import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ExtendedSocket } from '../../../../interfaces';
import { JwtSocketAuthGuard } from './jwt-socket-auth.guard';
import * as JWT from '@nestjs/jwt';

describe('JwtSocketAuthGuard', () => {
  let guard: JwtSocketAuthGuard;
  let socket: ExtendedSocket;
  let verifyAsyncSpy: jest.SpyInstance;

  const context = createMock<ExecutionContext>();

  beforeEach(async () => {
    guard = new JwtSocketAuthGuard();
    socket = {
      handshake: {
        query: {},
      },
    } as ExtendedSocket;

    verifyAsyncSpy = jest.spyOn(JWT.JwtService.prototype, 'verifyAsync');
  });

  it('should have auth guard methods', () => {
    expect(guard).toBeDefined();
    expect(guard.canActivate).toStrictEqual(expect.any(Function));
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException if no accessToken', async () => {
      context.getArgs.mockReturnValue([socket]);

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
    });

    it('should throw UnauthorizedException if jwtService.verifyAsync throws', async () => {
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.query = { accessToken: 'accessToken' };
      verifyAsyncSpy.mockRejectedValue(new Error('error'));

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
    });

    it('should throw UnauthorizedException if no user data', async () => {
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.query = { accessToken: 'accessToken' };
      verifyAsyncSpy.mockResolvedValue({});

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
    });

    it('should set user to socket', async () => {
      const fakeUser = { id: 'id' };
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.query = { accessToken: 'accessToken' };
      verifyAsyncSpy.mockResolvedValue({ ...fakeUser, iat: 1, exp: 2 });

      await guard.canActivate(context);

      expect(socket.user).toStrictEqual(fakeUser);
    });
  });
});
