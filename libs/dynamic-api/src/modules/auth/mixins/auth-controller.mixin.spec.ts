import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { BaseEntity } from '../../../models';
import { DynamicApiBroadcastService } from '../../../services';
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
  service.logout = jest.fn().mockResolvedValue(undefined);
  const broadcastService = createMock<DynamicApiBroadcastService>();
  const jwtService = createMock<JwtService>();

  it('should throw error when invalid entity is provided', () => {
    expect(() => AuthControllerMixin<TestEntity>(
      null,
      { loginField: 'loginField', passwordField: 'passwordField' },
      undefined,
      undefined,
      undefined,
    ))
    .toThrow();
  });

  it('should throw error when invalid loginField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      { loginField: null, passwordField: 'passwordField' },
      undefined,
      undefined,
      undefined,
    )).toThrow();
  });

  it('should throw error when invalid passwordField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      { loginField: 'loginField', passwordField: null },
      undefined,
      undefined,
      undefined,
    )).toThrow();
  });

  it('should create AuthController', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      { loginField: 'loginField', passwordField: 'passwordField' },
      undefined,
      undefined,
      undefined,
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
      { loginField: 'loginField', passwordField: 'passwordField', additionalFields: ['field1'] },
      {
        additionalFields: ['field1', { name: 'field2', required: true }, { name: 'field3', required: false }],
        abilityPredicate: (user: TestEntity) => user.isAdmin,
        protected: true,
      },
      undefined
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: { authorization: 'Bearer fake-token' } });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });

    it('should fall back to req.user when authorization header is missing', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service, undefined, jwtService);
      const user = new TestEntity();

      await controller.getAccount({ user, headers: {} as Record<string, string> });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });

    it('should fall back to req.user when jwtService.decode returns null', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const decodedUser = { id: 'decoded-id', loginField: 'decoded-login', iat: 1, exp: 9999 };
      jwtService.decode.mockReturnValueOnce(decodedUser);
      const controller = new AuthController(service, undefined, jwtService);

      await controller.updateAccount({ user: new TestEntity(), headers: { authorization: 'Bearer fake-token' } }, {});

      expect(jwtService.decode).toHaveBeenCalledWith('fake-token');
      expect(service.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'decoded-id', loginField: 'decoded-login' }),
        {},
      );
    });

    it('should fall back to req.user when jwtService is not available', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.updateAccount({ user, headers: { authorization: 'Bearer fake-token' } }, {});

      expect(service.updateAccount).toHaveBeenCalledWith(user, {});
    });
  });

  describe('login', () => {
    it('should call service login', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: jest.fn() };
      service.login.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      await controller.login({ user }, {}, fakeRes as unknown as Response);

      expect(service.login).toHaveBeenCalledWith(user);
    });

    it('should set cookie and return body without refreshToken when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined, undefined, undefined, undefined,
        { useCookie: true },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: jest.fn() };
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: jest.fn() };
      service.register.mockResolvedValueOnce({ accessToken: 'at', refreshToken: 'rt' });

      await controller.register({ user } as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

      expect(service.register).toHaveBeenCalledWith({ user });
    });

    it('should set cookie and return body without refreshToken when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined, undefined, undefined, undefined,
        { useCookie: true },
      );
      const controller = new AuthController(service);
      const fakeRes = { cookie: jest.fn() };
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined,
        undefined,
        undefined,
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
        { loginField: 'loginField', passwordField: 'passwordField' },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: jest.fn(), clearCookie: jest.fn() };

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
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined, undefined, undefined, undefined,
        { useCookie: true },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { cookie: jest.fn(), clearCookie: jest.fn() };

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
        { loginField: 'loginField', passwordField: 'passwordField' },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { clearCookie: jest.fn() };

      await controller.logout({ user }, fakeRes as unknown as Response);

      expect(service.logout).toHaveBeenCalledWith(user);
      expect(fakeRes.clearCookie).not.toHaveBeenCalled();
    });

    it('should clear cookie when useCookie is true', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        { loginField: 'loginField', passwordField: 'passwordField' },
        undefined, undefined, undefined, undefined,
        { useCookie: true },
      );
      const controller = new AuthController(service);
      const user = new TestEntity();
      const fakeRes = { clearCookie: jest.fn() };

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
      jest.clearAllMocks();
    });

    describe('login broadcast', () => {
      it('should call broadcastFromHttp with all user fields when broadcast enabled and no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

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
          { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true, fields: ['id', 'loginField'] } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

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
          { loginField: 'loginField', passwordField: 'passwordField', broadcast: { enabled: true, eventName: 'custom-login' } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

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
          { loginField: 'loginField', passwordField: 'passwordField' },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

        await controller.login({ user: fakeUser }, {}, fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });
    });

    describe('register broadcast', () => {
      it('should decode JWT and broadcast user fields when broadcast enabled', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField' },
          { broadcast: { enabled: true, fields: ['id', 'loginField'] } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

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
          { loginField: 'loginField', passwordField: 'passwordField' },
          { broadcast: { enabled: true } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };

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
          { loginField: 'loginField', passwordField: 'passwordField' },
          { broadcast: { enabled: true } },
        );
        const controller = new AuthController(service, broadcastService, undefined);
        const fakeRes = { cookie: jest.fn() };

        await controller.register({} as unknown as Parameters<typeof controller.register>[0], fakeRes as unknown as Response);

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });

      it('should broadcast with empty payload when jwtService.decode returns null', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField' },
          { broadcast: { enabled: true } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);
        const fakeRes = { cookie: jest.fn() };
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
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          undefined,
          { broadcast: { enabled: true, fields: ['id'] } },
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
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          undefined,
          { broadcast: { enabled: true } },
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
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          undefined,
          { broadcast: { enabled: true, eventName: 'custom-get-account', fields: ['id'] } },
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
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          undefined,
          {},
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
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          { broadcast: { enabled: true, fields: ['id', 'loginField'] } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {});

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [{ id: 'user-id', loginField: 'test@test.co' }],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should broadcast all updated account fields when no fields specified', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          { broadcast: { enabled: true } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {});

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [fakeAccount],
          expect.objectContaining({ enabled: true }),
        );
      });

      it('should use custom eventName for updateAccount broadcast', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          { broadcast: { enabled: true, eventName: 'custom-update-account', fields: ['id'] } },
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {});

        expect(broadcastService.broadcastFromHttp).toHaveBeenCalledWith(
          'custom-update-account',
          expect.any(Array),
          expect.any(Object),
        );
      });

      it('should not broadcast updateAccount when broadcast config is not set', async () => {
        const AuthController = AuthControllerMixin(
          TestEntity,
          { loginField: 'loginField', passwordField: 'passwordField' },
          undefined,
          undefined,
          {},
        );
        const controller = new AuthController(service, broadcastService, jwtService);

        await controller.updateAccount({ user: fakeUser, headers: { authorization: 'Bearer fake-token' } }, {});

        expect(broadcastService.broadcastFromHttp).not.toHaveBeenCalled();
      });
    });
  });
});

