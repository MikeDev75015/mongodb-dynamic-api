import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { createMock } from '@test-helpers';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { DynamicApiEventRegistryStore } from '../../../helpers/event-registry.store';
import { BaseEntity } from '../../../models';
import { DynamicApiBroadcastService } from '../../../services';
import { authOperationStorage, getAuthOperationContext } from '../auth-operation-context';
import { AuthService } from '../interfaces';
import { AuthControllerMixin } from './auth-controller.mixin';

describe('AuthControllerMixin', () => {
  class TestEntity extends BaseEntity {
    loginField: string;

    passwordField: string;

    field1?: string;

    field2?: string;

    field3?: string;

    isAdmin?: boolean;
  }

  const service = createMock<AuthService<TestEntity>>();
  service.logout = vi.fn().mockResolvedValue(undefined);
  const broadcastService = createMock<DynamicApiBroadcastService>();
  const jwtService = createMock<JwtService>();

  it('should throw error when invalid entity is provided', () => {
    expect(() => AuthControllerMixin<TestEntity>(
      null,
      { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
    ))
    .toThrow();
  });

  it('should throw error when invalid loginField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      { loginOptions: { loginField: null, passwordField: 'passwordField' } },
    )).toThrow();
  });

  it('should throw error when invalid passwordField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      { loginOptions: { loginField: 'loginField', passwordField: null } },
    )).toThrow();
  });

  it('should create AuthController', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
    );
    const controller = new AuthController(service);

    expect(controller).toBeDefined();
    expect(controller).toHaveProperty('login', expect.any(Function));
    expect(controller).toHaveProperty('register', expect.any(Function));
    expect(controller).toHaveProperty('getAccount', expect.any(Function));
    expect(controller).toHaveProperty('updateAccount', expect.any(Function));
    expect(controller).toHaveProperty('resetPassword', expect.any(Function));
    expect(controller).toHaveProperty('changePassword', expect.any(Function));
    expect(controller).toHaveProperty('refreshToken', expect.any(Function));
    expect(controller).toHaveProperty('logout', expect.any(Function));
  });

  it('should create AuthController with additional fields', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      {
        loginOptions: { loginField: 'loginField', passwordField: 'passwordField', additionalFields: ['field1'] },
        registerOptions: {
          additionalFields: ['field1', { name: 'field2', required: true }, { name: 'field3', required: false }],
          abilityPredicate: (user: TestEntity) => user.isAdmin,
          protected: true,
        },
      },
    );
    const controller = new AuthController(service);

    expect(controller).toBeDefined();
    expect(controller).toHaveProperty('login', expect.any(Function));
    expect(controller).toHaveProperty('register', expect.any(Function));
    expect(controller).toHaveProperty('getAccount', expect.any(Function));
    expect(controller).toHaveProperty('resetPassword', expect.any(Function));
    expect(controller).toHaveProperty('changePassword', expect.any(Function));
  });

  describe('getAccount', () => {
    it('should decode JWT from authorization header and call service getAccount with decoded user', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const decodedUser = { id: 'decoded-id', loginField: 'decoded-login', iat: 1, exp: 9999 };
      jwtService.decode.mockReturnValueOnce(decodedUser);
      const controller = new AuthController(service, undefined, jwtService);

      await controller.getAccount({ user: new TestEntity(), headers: { authorization: 'Bearer fake-token' } });

      expect(jwtService.decode).toHaveBeenCalledWith('fake-token');
      expect(service.getAccount).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'decoded-id', loginField: 'decoded-login' }),
      );
    });

    it('should fall back to req.user when jwtService is not available', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: { authorization: 'Bearer fake-token' } });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });

    it('should fall back to req.user when authorization header is missing', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service, undefined, jwtService);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: {} as Record<string, string> });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });

    it('should fall back to req.user when jwtService.decode returns null', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      jwtService.decode.mockReturnValueOnce(null);
      const controller = new AuthController(service, undefined, jwtService);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: { authorization: 'Bearer bad-token' } });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });

    it('should fall back to req.user when jwtService.decode throws', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      jwtService.decode.mockImplementationOnce(() => { throw new Error('decode error'); });
      const controller = new AuthController(service, undefined, jwtService);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: { authorization: 'Bearer bad-token' } });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });
  });

  describe('updateAccount', () => {
    it('should decode JWT from authorization header and call service updateAccount with decoded user', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const decodedUser = { id: 'decoded-id', loginField: 'decoded-login', iat: 1, exp: 9999 };
      jwtService.decode.mockReturnValueOnce(decodedUser);
      const controller = new AuthController(service, undefined, jwtService);

      await controller.updateAccount({ user: new TestEntity(), headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

      expect(jwtService.decode).toHaveBeenCalledWith('fake-token');
      expect(service.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'decoded-id', loginField: 'decoded-login' }),
        {},
      );
    });

    it('should fall back to req.user when jwtService is not available', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.updateAccount({ user, headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

      expect(service.updateAccount).toHaveBeenCalledWith(user, {});
    });

    describe('with refreshTokenOnUpdate = true', () => {
      it('should return LoginResponse when service returns accessToken', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: { refreshTokenOnUpdate: true } },
        );
        const controller = new AuthController(service);
        const user = new TestEntity();
        const fakeRes = { cookie: vi.fn() };
        service.updateAccount.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

        const result = await controller.updateAccount(
          { user, headers: {} as Record<string, string> },
          {},
          fakeRes as unknown as Response,
        );

        expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
        expect(fakeRes.cookie).not.toHaveBeenCalled();
      });

      it('should set cookie and strip refreshToken when useCookie + refreshTokenOnUpdate', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          {
            loginOptions: { loginField: 'loginField', passwordField: 'passwordField' },
            updateAccountOptions: { refreshTokenOnUpdate: true },
            refreshTokenOptions: { useCookie: true },
          },
        );
        const controller = new AuthController(service);
        const user = new TestEntity();
        const fakeRes = { cookie: vi.fn() };
        service.updateAccount.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

        const result = await controller.updateAccount(
          { user, headers: {} as Record<string, string> },
          {},
          fakeRes as unknown as Response,
        );

        expect(fakeRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.objectContaining({ httpOnly: true }));
        expect(result).toEqual({ accessToken: 'at' });
      });

      it('should return account entity when service returns entity (no accessToken)', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: { refreshTokenOnUpdate: true } },
        );
        const controller = new AuthController(service);
        const user = new TestEntity();
        const fakeRes = { cookie: vi.fn() };
        const fakeAccount = Object.assign(new TestEntity(), { id: 'acc-id', loginField: 'test@test.co' });
        service.updateAccount.mockResolvedValueOnce(fakeAccount);

        const result = await controller.updateAccount(
          { user, headers: {} as Record<string, string> },
          {},
          fakeRes as unknown as Response,
        );

        expect(result).toEqual(fakeAccount);
      });
    });
  });

  describe('authOperationStorage context', () => {
    it('should run login in "login" context', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const fakeRes = { cookie: vi.fn() };
      let capturedContext: string | undefined;

      service.login.mockImplementationOnce(async () => {
        capturedContext = getAuthOperationContext();
        return { accessToken: 'at', refreshToken: 'rt' };
      });

      await controller.login({ user: new TestEntity() }, {}, fakeRes as unknown as Response);

      expect(capturedContext).toBe('login');
    });

    it('should run register in "register" context', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const fakeRes = { cookie: vi.fn() };
      let capturedContext: string | undefined;

      service.register.mockImplementationOnce(async () => {
        capturedContext = getAuthOperationContext();
        return { accessToken: 'at', refreshToken: 'rt' };
      });

      await controller.register({} as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

      expect(capturedContext).toBe('register');
    });

    it('should run updateAccount in "updateAccount" context', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const fakeRes = { cookie: vi.fn() };
      let capturedContext: string | undefined;

      service.updateAccount.mockImplementationOnce(async () => {
        capturedContext = getAuthOperationContext();
        return new TestEntity();
      });

      await controller.updateAccount(
        { user: new TestEntity(), headers: {} as Record<string, string> },
        {},
        fakeRes as unknown as Response,
      );

      expect(capturedContext).toBe('updateAccount');
    });

    it('should return undefined context outside of any auth operation', () => {
      expect(getAuthOperationContext()).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should call service login', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: vi.fn() };
      service.login.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      await controller.login({ user }, {}, fakeRes as unknown as Response);

      expect(service.login).toHaveBeenCalledWith(user);
    });

    it('should set cookie and return body without refreshToken when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, refreshTokenOptions: { useCookie: true } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: vi.fn() };
      service.login.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      const result = await controller.login({ user }, {}, fakeRes as unknown as Response);

      expect(fakeRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.objectContaining({ httpOnly: true }));
      expect(result).toEqual({ accessToken: 'at' });
    });
  });

  describe('register', () => {
    it('should call service register', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: vi.fn() };
      service.register.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      await controller.register({ user } as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

      expect(service.register).toHaveBeenCalledWith({ user });
    });

    it('should set cookie and return body without refreshToken when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, refreshTokenOptions: { useCookie: true } },
      );
      const controller = new AuthController(service);
      const fakeRes = { cookie: vi.fn() };
      service.register.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      const result = await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

      expect(fakeRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.objectContaining({ httpOnly: true }));
      expect(result).toEqual({ accessToken: 'at' });
    });
  });

  describe('resetPassword', () => {
    it('should call service resetPassword', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);

      await controller.resetPassword({ email: 'fake-email' });

      expect(service.resetPassword).toHaveBeenCalledWith('fake-email');
    });
  });

  describe('changePassword', () => {
    it('should call service changePassword', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);

      await controller.changePassword({ resetPasswordToken: 'fake-token', newPassword: 'fake-password' });

      expect(service.changePassword).toHaveBeenCalledWith('fake-token', 'fake-password');
    });
  });

  describe('refreshToken', () => {
    it('should call service refreshToken with user and raw Bearer token from request', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: vi.fn(), clearCookie: vi.fn() };

      service.refreshToken.mockResolvedValueOnce({ accessToken: 'new-at', refreshToken: 'new-rt' });

      await controller.refreshToken({
        user,
        headers: { authorization: 'Bearer raw-refresh-token' },
        cookies: {},
      }, fakeRes as unknown as Response);

      expect(service.refreshToken).toHaveBeenCalledWith(user, 'raw-refresh-token');
    });

    it('should call service refreshToken with cookie token when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, refreshTokenOptions: { useCookie: true } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: vi.fn(), clearCookie: vi.fn() };

      service.refreshToken.mockResolvedValueOnce({ accessToken: 'new-at', refreshToken: 'new-rt' });

      await controller.refreshToken({
        user,
        headers: {},
        cookies: { refreshToken: 'cookie-refresh-token' },
      }, fakeRes as unknown as Response);

      expect(service.refreshToken).toHaveBeenCalledWith(user, 'cookie-refresh-token');
      expect(fakeRes.cookie).toHaveBeenCalledWith('refreshToken', 'new-rt', expect.objectContaining({ httpOnly: true }));
    });
  });

  describe('logout', () => {
    it('should call service logout', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { clearCookie: vi.fn() };

      await controller.logout({ user }, fakeRes as unknown as Response);

      expect(service.logout).toHaveBeenCalledWith(user);
      expect(fakeRes.clearCookie).not.toHaveBeenCalled();
    });

    it('should clear cookie when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, refreshTokenOptions: { useCookie: true } },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { clearCookie: vi.fn() };

      await controller.logout({ user }, fakeRes as unknown as Response);

      expect(service.logout).toHaveBeenCalledWith(user);
      expect(fakeRes.clearCookie).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('broadcast', () => {
    const fakeUser: TestEntity = Object.assign(new TestEntity(), {
      id: 'user-id',
      loginField: 'test@test.co',
      passwordField: 'hashed',
    });
    const fakeAccount = { id: 'user-id', loginField: 'test@test.co' } as unknown as TestEntity;
    const fakeAccessToken = 'fake.jwt.token';

    beforeEach(() => {
      service.login.mockResolvedValue({ accessToken: fakeAccessToken, refreshToken: 'fake-rt' });
      service.register.mockResolvedValue({ accessToken: fakeAccessToken, refreshToken: 'fake-rt' });
      service.getAccount.mockResolvedValue(fakeAccount);
      service.updateAccount.mockResolvedValue(fakeAccount);
      jwtService.decode.mockReturnValue({ id: 'user-id', loginField: 'test@test.co', iat: 1, exp: 9999 });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('login broadcast', () => {
      it('should call broadcastFromHttp with all user fields when broadcast enabled and no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.login({ user: fakeUser }, {}, fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-login-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co', passwordField: 'hashed' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should broadcast only specified fields', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true, fields: ['id', 'loginField'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.login({ user: fakeUser }, {}, fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-login-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should use custom eventName when provided', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true, eventName: 'custom-login' } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.login({ user: fakeUser }, {}, fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'custom-login',
          expect.any(Array),
          expect.any(Object),
        );
      });

      it('should not broadcast when broadcast config is not set', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.login({ user: fakeUser }, {}, fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });
    });

    describe('register broadcast', () => {
      it('should decode JWT and broadcast user fields when broadcast enabled', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, registerOptions: { broadcast: { enabled: true, fields: ['id', 'loginField'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

        expect(jwtService.decode).toHaveBeenCalledWith(fakeAccessToken);
        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-register-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should broadcast all decoded JWT fields when no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, registerOptions: { broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };

        await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-register-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should not broadcast register when jwtService is absent', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, registerOptions: { broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, undefined);
        const fakeRes = { cookie: vi.fn() };

        await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });

      it('should broadcast with empty payload when jwtService.decode returns null', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, registerOptions: { broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: vi.fn() };
        jwtService.decode.mockReturnValueOnce(null);

        await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-register-broadcast',
          [{}],
          expect.objectContaining({ enabled: true }),
        );
      });
    });

    describe('getAccount broadcast', () => {
      it('should broadcast account with specified fields', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, getAccountOptions: { broadcast: { enabled: true, fields: ['id'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.getAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } });

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-get-account-broadcast',
          [{ id: 'user-id' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should broadcast all account fields when no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, getAccountOptions: { broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.getAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } });

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-get-account-broadcast',
          [fakeAccount],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should use custom eventName for getAccount broadcast', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, getAccountOptions: { broadcast: { enabled: true, eventName: 'custom-get-account', fields: ['id'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.getAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } });

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'custom-get-account',
          expect.any(Array),
          expect.any(Object),
        );
      });

      it('should not broadcast getAccount when broadcast config is not set', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, getAccountOptions: {} },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.getAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } });

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });
    });

    describe('updateAccount broadcast', () => {
      it('should broadcast updated account with specified fields', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: { broadcast: { enabled: true, fields: ['id', 'loginField'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should broadcast all updated account fields when no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: { broadcast: { enabled: true } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [fakeAccount],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should use custom eventName for updateAccount broadcast', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: { broadcast: { enabled: true, eventName: 'custom-update-account', fields: ['id'] } } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'custom-update-account',
          expect.any(Array),
          expect.any(Object),
        );
      });

      it('should not broadcast updateAccount when broadcast config is not set', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, updateAccountOptions: {} },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {}, { cookie: vi.fn() } as unknown as Response);

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });
    });
  });

  describe('sendOtpCode', () => {
    it('should have sendOtpCode method', () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);

      expect(controller).toHaveProperty('sendOtpCode', expect.any(Function));
    });

    it('should call service.sendOtpCode with identifier', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, passwordlessOptions: { otpExpirationMinutes: 5, sendCodeCallback: vi.fn() } },
      );
      const controller = new AuthController(service);
      service.sendOtpCode = vi.fn().mockResolvedValue(undefined);

      await controller.sendOtpCode({ identifier: 'user@test.co' });

      expect(service.sendOtpCode).toHaveBeenCalledWith('user@test.co');
    });
  });

  describe('verifyOtpCode', () => {
    it('should have verifyOtpCode method', () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );
      const controller = new AuthController(service);

      expect(controller).toHaveProperty('verifyOtpCode', expect.any(Function));
    });

    it('should call service.verifyOtpCode and return tokens', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' }, passwordlessOptions: { otpExpirationMinutes: 5, sendCodeCallback: vi.fn() } },
      );
      const controller = new AuthController(service);
      const tokenResult = { accessToken: 'at', refreshToken: 'rt' };
      service.verifyOtpCode = vi.fn().mockResolvedValue(tokenResult);
      const fakeRes = { cookie: vi.fn() } as unknown as Response;

      const result = await controller.verifyOtpCode({ identifier: 'user@test.co', code: '123456' }, fakeRes);

      expect(service.verifyOtpCode).toHaveBeenCalledWith('user@test.co', '123456');
      expect(result).toEqual(tokenResult);
    });

    it('should set cookie and strip refreshToken when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        {
          loginOptions: { loginField: 'loginField', passwordField: 'passwordField' },
          refreshTokenOptions: { useCookie: true },
          passwordlessOptions: { otpExpirationMinutes: 5, sendCodeCallback: vi.fn() },
        },
      );
      const controller = new AuthController(service);
      service.verifyOtpCode = vi.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      const fakeRes = { cookie: vi.fn() } as unknown as Response;

      const result = await controller.verifyOtpCode({ identifier: 'user@test.co', code: '123456' }, fakeRes);

      expect(fakeRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'rt',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'at' });
    });
  });

  describe('event registry registration', () => {
    beforeEach(() => {
      DynamicApiEventRegistryStore.reset();
    });

    it('should not register anything when no broadcast option is configured', () => {
      AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([]);
    });

    it('should register login/register/getAccount/updateAccount broadcast events once at setup time', () => {
      AuthControllerMixin(
        TestEntity,
        {
          loginOptions: { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true } },
          registerOptions: { broadcast: { enabled: true } },
          getAccountOptions: { broadcast: { enabled: true } },
          updateAccountOptions: { broadcast: { enabled: true } },
        },
      );

      const events = DynamicApiEventRegistryStore.getAll().map(({ event, channels }) => ({ event, channels }));

      expect(events).toEqual(expect.arrayContaining([
        { event: 'auth-login-broadcast', channels: ['http'] },
        { event: 'auth-register-broadcast', channels: ['http'] },
        { event: 'auth-get-account-broadcast', channels: ['http'] },
        { event: 'auth-update-account-broadcast', channels: ['http'] },
      ]));
      expect(events).toHaveLength(4);
    });

    it('should register the broadcast.eventName override rather than the default event name', () => {
      AuthControllerMixin(
        TestEntity,
        {
          loginOptions: {
            loginField: 'loginField',
            passwordField: 'passwordField',
            broadcast: { enabled: true, eventName: 'custom-login' },
          },
        },
      );

      expect(DynamicApiEventRegistryStore.getAll()).toEqual([
        expect.objectContaining({ event: 'custom-login', isCustomEventName: true }),
      ]);
    });
  });

  describe('rateLimit', () => {
    // Mirrors @nestjs/common's GUARDS_METADATA and @nestjs/throttler's THROTTLER_LIMIT/TTL
    // constants — see decorators/rate-limit.decorator.spec.ts for why these are hardcoded.
    const GUARDS_METADATA = '__guards__';
    const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
    const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';

    const isThrottled = (method: (...args: unknown[]) => unknown, expected?: { limit: number; ttl: number }) => {
      if (!expected) {
        expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, method)).toBeUndefined();
        return;
      }
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toBeDefined();
      expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, method)).toBe(expected.limit);
      expect(Reflect.getMetadata(THROTTLER_TTL_DEFAULT, method)).toBe(expected.ttl);
    };

    it('should not throttle any route when no rateLimit option is configured', () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginOptions: { loginField: 'loginField', passwordField: 'passwordField' } },
      );

      isThrottled(AuthController.prototype.login);
      isThrottled(AuthController.prototype.register);
      isThrottled(AuthController.prototype.refreshToken);
      isThrottled(AuthController.prototype.resetPassword);
      isThrottled(AuthController.prototype.changePassword);
      isThrottled(AuthController.prototype.sendOtpCode);
      isThrottled(AuthController.prototype.verifyOtpCode);
    });

    it('should apply rateLimit independently to each configured route', () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        {
          loginOptions: {
            loginField: 'loginField',
            passwordField: 'passwordField',
            rateLimit: { limit: 5, ttl: 60000 },
          },
          registerOptions: { rateLimit: { limit: 3, ttl: 60000 } },
          refreshTokenOptions: { rateLimit: { limit: 10, ttl: 60000 } },
          resetPasswordOptions: {
            rateLimit: { limit: 3, ttl: 3600000 },
            changePasswordRateLimit: { limit: 3, ttl: 3600000 },
          },
          passwordlessOptions: {
            sendCodeCallback: vi.fn(),
            sendCodeRateLimit: { limit: 3, ttl: 60000 },
            verifyCodeRateLimit: { limit: 5, ttl: 60000 },
          },
        },
      );

      isThrottled(AuthController.prototype.login, { limit: 5, ttl: 60000 });
      isThrottled(AuthController.prototype.register, { limit: 3, ttl: 60000 });
      isThrottled(AuthController.prototype.refreshToken, { limit: 10, ttl: 60000 });
      isThrottled(AuthController.prototype.resetPassword, { limit: 3, ttl: 3600000 });
      isThrottled(AuthController.prototype.changePassword, { limit: 3, ttl: 3600000 });
      isThrottled(AuthController.prototype.sendOtpCode, { limit: 3, ttl: 60000 });
      isThrottled(AuthController.prototype.verifyOtpCode, { limit: 5, ttl: 60000 });
    });
  });
});

