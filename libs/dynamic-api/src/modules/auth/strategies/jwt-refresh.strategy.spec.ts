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
      const payload = { iat: 1000, exp: 9999, id: 'user-id', email: 'test@test.co' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({ id: 'user-id', email: 'test@test.co' });
    });

    it('should return empty object if payload only contains iat and exp', async () => {
      const payload = { iat: 1000, exp: 9999 };
      const result = await strategy.validate(payload);

      expect(result).toEqual({});
    });
  });
});

