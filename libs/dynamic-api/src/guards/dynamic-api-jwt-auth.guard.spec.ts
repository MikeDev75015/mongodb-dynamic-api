import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { DynamicApiModule } from '../dynamic-api.module';
import { DynamicApiJwtAuthGuard } from './dynamic-api-jwt-auth.guard';
import { DynamicApiGlobalState } from '../interfaces/dynamic-api-global-state.interface';

describe('DynamicApiJwtAuthGuard', () => {
  let guard: DynamicApiJwtAuthGuard;
  let reflector: Reflector;
  let context: ExecutionContext;

  beforeEach(async () => {
    DynamicApiModule.state.set(['partial', {
      isAuthEnabled: true,
      initialized: true,
    }]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: 'DynamicApiGlobalState', useValue: DynamicApiModule.state.get() },
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        {
          provide: DynamicApiJwtAuthGuard,
          inject: [Reflector, 'DynamicApiGlobalState'],
          useFactory: (reflector, state) =>
            new DynamicApiJwtAuthGuard(reflector, state),
        },
      ],
    }).compile();

    guard = moduleRef.get<DynamicApiJwtAuthGuard>(DynamicApiJwtAuthGuard);
    reflector = moduleRef.get<Reflector>(Reflector);
    context = { getHandler: vi.fn(), getClass: vi.fn() } as unknown as ExecutionContext;
  });

  it('should allow access if route is public', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if auth is not enabled', () => {
    guard['state'].isAuthEnabled = false;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if route is not public and auth is enabled', () => {
    const spy = vi.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockImplementationOnce(() => false);
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(false);
    expect(spy).toHaveBeenCalledWith(context);
  });

  it('should allow access if route is not public and auth is enabled', () => {
    const spy = vi.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockImplementationOnce(() => true);
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);


    expect(guard.canActivate(context)).toBe(true);
    expect(spy).toHaveBeenCalledWith(context);
  });

  describe('handleRequest', () => {
    let superHandleRequestSpy: Mock;
    let loggerWarnSpy: Mock;

    beforeEach(() => {
      superHandleRequestSpy = vi.spyOn(AuthGuard('jwt').prototype, 'handleRequest').mockImplementationOnce(
        (err, user) => {
          if (err || !user) {
            throw err || new Error('Unauthorized');
          }
          return user;
        },
      );
      loggerWarnSpy = vi.spyOn(guard['logger'], 'warn').mockImplementation(() => undefined);
    });

    it('should return the user without logging when authentication succeeds', () => {
      const user = { id: '1' };

      expect(guard.handleRequest(null, user, null, context)).toBe(user);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should log the error message and rethrow when err is an Error instance', () => {
      const error = new Error('jwt expired');

      expect(() => guard.handleRequest(error, null, null, context)).toThrow(error);
      expect(loggerWarnSpy).toHaveBeenCalledWith('Request rejected: jwt expired');
    });

    it('should log the info message when info is an Error instance', () => {
      const info = new Error('No auth token');
      superHandleRequestSpy.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      expect(() => guard.handleRequest(null, null, info, context)).toThrow();
      expect(loggerWarnSpy).toHaveBeenCalledWith('Request rejected: No auth token');
    });

    it('should log the info name when info is an Error instance with an empty message', () => {
      class TokenExpiredError extends Error {
        constructor() {
          super('');
          this.name = 'TokenExpiredError';
        }
      }
      superHandleRequestSpy.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      expect(() => guard.handleRequest(null, null, new TokenExpiredError(), context)).toThrow();
      expect(loggerWarnSpy).toHaveBeenCalledWith('Request rejected: TokenExpiredError');
    });

    it('should log the info string when info has no message', () => {
      superHandleRequestSpy.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      expect(() => guard.handleRequest(null, null, 'No auth token', context)).toThrow();
      expect(loggerWarnSpy).toHaveBeenCalledWith('Request rejected: No auth token');
    });

    it('should log a generic reason when neither err nor info carry a message', () => {
      superHandleRequestSpy.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      expect(() => guard.handleRequest(null, null, null, context)).toThrow();
      expect(loggerWarnSpy).toHaveBeenCalledWith('Request rejected: missing or invalid token');
    });
  });
});