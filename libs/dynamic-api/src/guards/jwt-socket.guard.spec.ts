import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { createMock } from '@test-helpers';
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
  const auth = {};
  const socket = createMock<Socket>({
    id: 'test-socket-id',
    handshake: { query, auth },
  });
  const context = createMock<ExecutionContext>({
    getArgs: () => [socket],
  });

  beforeEach(() => {
    vi.spyOn(DynamicApiModule.state, 'get').mockImplementation((key: string) => key);
  });

  it('should allow access with isPublic set to true', async () => {
    guard = new JwtSocketGuard(true);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  describe('isPublic is false', () => {
    beforeEach(() => {
      guard = new JwtSocketGuard();
      query['accessToken'] = undefined;
      auth['token'] = undefined;
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

    it('should allow access with valid JWT via auth.token', async () => {
      const accessToken = 'valid.jwt.token.from.auth';
      auth['token'] = accessToken;
      const verifyAsyncSpy = vi.spyOn(JwtService.prototype, 'verifyAsync').mockResolvedValueOnce({
        user,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(verifyAsyncSpy).toHaveBeenCalledWith(accessToken, {
        secret: 'jwtSecret',
        ignoreExpiration: false,
      });
    });

    it('ignores a token passed via the deprecated query.accessToken, v5 only reads auth.token', async () => {
      query['accessToken'] = 'query.token.value';
      const verifyAsyncSpy = vi.spyOn(JwtService.prototype, 'verifyAsync');

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      expect(verifyAsyncSpy).not.toHaveBeenCalled();
    });

    it('should deny access if no access token is provided', async () => {
      auth['token'] = undefined;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should deny access with invalid JWT', async () => {
      auth['token'] = 'valid.jwt.token';
      vi.spyOn(JwtService.prototype, 'verifyAsync').mockRejectedValueOnce(
        new Error('Invalid token'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should deny access if user data is not present in the token', async () => {
      auth['token'] = 'valid.jwt.token';
      vi.spyOn(JwtService.prototype, 'verifyAsync').mockResolvedValueOnce({});

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });
  });
});