import { beforeEach, describe, expect, it, test } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  const setupState = (overrides: Partial<{ jwtRefreshUseCookie: boolean; jwtRefreshSecret: string; jwtSecret: string }> = {}) => {
    DynamicApiModule.state.set(['partial', {
      jwtSecret: 'access-secret',
      jwtRefreshSecret: undefined,
      jwtRefreshUseCookie: undefined,
      ...overrides,
    }]);
  };

  const buildStrategy = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtRefreshStrategy],
    }).compile();
    return moduleRef.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  };

  describe('extractFromCookies (static)', () => {
    it('should return the refreshToken from cookies', () => {
      const req = { cookies: { refreshToken: 'my-token' } };
      expect(JwtRefreshStrategy.extractFromCookies(req)).toBe('my-token');
    });

    it('should return null when refreshToken cookie is absent', () => {
      expect(JwtRefreshStrategy.extractFromCookies({ cookies: {} })).toBeNull();
    });

    it('should return null when cookies property is undefined', () => {
      expect(JwtRefreshStrategy.extractFromCookies({})).toBeNull();
    });
  });

  describe('with Bearer mode (useCookie: false / undefined)', () => {
    beforeEach(async () => {
      setupState({ jwtRefreshUseCookie: false });
      strategy = await buildStrategy();
    });

    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should use jwtRefreshSecret when provided', async () => {
      setupState({ jwtRefreshUseCookie: false, jwtRefreshSecret: 'refresh-secret' });
      strategy = await buildStrategy();
      expect(strategy).toBeDefined();
    });

    it('should fall back to jwtSecret when jwtRefreshSecret is undefined', async () => {
      setupState({ jwtRefreshUseCookie: false, jwtRefreshSecret: undefined });
      strategy = await buildStrategy();
      expect(strategy).toBeDefined();
    });
  });

  describe('with Cookie mode (useCookie: true)', () => {
    beforeEach(async () => {
      setupState({ jwtRefreshUseCookie: true });
      strategy = await buildStrategy();
    });

    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      setupState();
      strategy = await buildStrategy();
    });

    it('should return user payload without iat and exp', async () => {
      const payload = { iat: 1000, exp: 9999, typ: 'refresh', id: 'user-id', email: 'test@test.co' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({ id: 'user-id', email: 'test@test.co' });
    });

    it('should return user payload without iat, exp and jti', async () => {
      const payload = { iat: 1000, exp: 9999, typ: 'refresh', jti: 'some-jti', id: 'user-id', email: 'test@test.co' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({ id: 'user-id', email: 'test@test.co' });
    });

    it('should accept a refresh token and strip its typ and jti claims', async () => {
      const result = await strategy.validate({ iat: 1, exp: 2, typ: 'refresh', jti: 'j', id: 'user-id' });

      expect(result).toEqual({ id: 'user-id' });
    });

    it.each(['access', 'reset'])('should reject a %s token used as refresh token', async (typ) => {
      await expect(strategy.validate({ iat: 1, exp: 2, typ, id: 'user-id' })).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a token without typ (signed before v5.4.2)', async () => {
      await expect(strategy.validate({ iat: 1000, exp: 9999, id: 'user-id' })).rejects.toThrow(UnauthorizedException);
    });
  });
});

