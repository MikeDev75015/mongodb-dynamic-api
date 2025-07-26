import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DynamicApiModule } from '../dynamic-api.module';
import { JwtSocketGuard } from './jwt-socket.guard';

describe('JwtSocketGuard', () => {
  let guard: JwtSocketGuard;

  const user = {
    id: 'test-user-id',
    email: 'user@mail.co',
  };
  const query = {};
  const socket = createMock<Socket>({
    id: 'test-socket-id',
    handshake: { query },
  });
  const context = createMock<ExecutionContext>({
    getArgs: () => [socket],
  });

  beforeEach(() => {
    jest.spyOn(DynamicApiModule.state, 'get').mockImplementation((key: string) => key);
  });

  it('should allow access with isPublic set to true', async () => {
    guard = new JwtSocketGuard(true);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  describe('isPublic is false', () => {
    beforeEach(() => {
      guard = new JwtSocketGuard();
    });

    it('should be defined', () => {
      expect(new JwtSocketGuard(false)).toBeDefined();
    });

    it('should implement CanActivate interface', () => {
      expect(guard).toHaveProperty('canActivate');
    });

    it('should have a canActivate method', () => {
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should allow access with valid JWT', async () => {
      const accessToken = 'valid.jwt.token';
      query['accessToken'] = accessToken;
      const verifyAsyncSpy = jest.spyOn(JwtService.prototype, 'verifyAsync').mockResolvedValueOnce({
        user,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(verifyAsyncSpy).toHaveBeenCalledWith(accessToken, {
        secret: 'jwtSecret',
        ignoreExpiration: false,
      });
    });

    it('should deny access if no access token is provided', async () => {
      query['accessToken'] = undefined;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should deny access with invalid JWT', async () => {
      query['accessToken'] = 'valid.jwt.token';
      jest.spyOn(JwtService.prototype, 'verifyAsync').mockRejectedValueOnce(
        new Error('Invalid token'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should deny access if user data is not present in the token', async () => {
      query['accessToken'] = 'valid.jwt.token';
      jest.spyOn(JwtService.prototype, 'verifyAsync').mockResolvedValueOnce({});

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });
  });
});