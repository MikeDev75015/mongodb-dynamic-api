import { beforeEach, describe, expect, it, test } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { DynamicApiModule } from '../../../dynamic-api.module';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    DynamicApiModule.state.set(['partial', {
      jwtSecret: 'test',
      credentials: {
        loginField: 'username',
        passwordField: 'password',
      },
    }]);

    const moduleRef = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user without iat, exp and typ fields', async () => {
      const payload = { iat: 123, exp: 456, typ: 'access', username: 'test', password: 'test' };
      const user = await jwtStrategy.validate(payload);
      expect(user).toEqual({ username: 'test', password: 'test' });
    });

    it('should accept an access token and strip its typ claim', async () => {
      const user = await jwtStrategy.validate({ iat: 1, exp: 2, typ: 'access', username: 'test' });
      expect(user).toEqual({ username: 'test' });
    });

    it.each(['refresh', 'reset'])('should reject a %s token used as access token', async (typ) => {
      await expect(jwtStrategy.validate({ iat: 1, exp: 2, typ, username: 'test' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject a token without typ (signed before v5.4.2)', async () => {
      await expect(jwtStrategy.validate({ iat: 123, exp: 456, username: 'test' })).rejects.toThrow(UnauthorizedException);
    });
  });
});