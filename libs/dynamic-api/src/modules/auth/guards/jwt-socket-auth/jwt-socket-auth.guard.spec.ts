import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createMock } from '@test-helpers';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ExtendedSocket } from '../../../../interfaces';
import { JwtSocketAuthGuard } from './jwt-socket-auth.guard';
import * as JWT from '@nestjs/jwt';

describe('JwtSocketAuthGuard', () => {
  let guard: JwtSocketAuthGuard;
  let socket: ExtendedSocket;
  let verifyAsyncSpy: Mock;

  const context = createMock<ExecutionContext>();

  beforeEach(async () => {
    guard = new JwtSocketAuthGuard();
    socket = {
      handshake: {
        query: {},
      },
    } as ExtendedSocket;

    verifyAsyncSpy = vi.spyOn(JWT.JwtService.prototype, 'verifyAsync');
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
      socket.handshake.auth = { token: 'accessToken' };
      verifyAsyncSpy.mockRejectedValue(new Error('error'));

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
    });

    it('should throw UnauthorizedException if no user data', async () => {
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.auth = { token: 'accessToken' };
      verifyAsyncSpy.mockResolvedValue({});

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
    });

    it('should set user to socket when token is provided via auth.token', async () => {
      const fakeUser = { id: 'id' };
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.auth = { token: 'authToken' };
      verifyAsyncSpy.mockResolvedValue({ ...fakeUser, iat: 1, exp: 2 });

      await guard.canActivate(context);

      expect(socket.user).toStrictEqual(fakeUser);
      expect(verifyAsyncSpy).toHaveBeenCalledWith('authToken', expect.any(Object));
    });

    it('ignores a token passed via the deprecated query.accessToken, v5 only reads auth.token', async () => {
      context.getArgs.mockReturnValue([socket]);
      socket.handshake.query = { accessToken: 'queryToken' };

      await expect(guard.canActivate(context)).rejects.toThrow(new WsException('Unauthorized'));
      expect(verifyAsyncSpy).not.toHaveBeenCalled();
    });
  });
});
