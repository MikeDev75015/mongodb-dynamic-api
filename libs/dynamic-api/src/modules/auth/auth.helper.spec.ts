import { createMock } from '@golevelup/ts-jest';
import { ForbiddenException, Type, UnauthorizedException, ValidationPipeOptions } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import {
  authServiceProviderName,
  createAuthController, createAuthGateway,
  createAuthServiceProvider,
  createLocalStrategyProvider,
  localStrategyProviderName,
} from './auth.helper';
import {
  AuthService,
  DynamicApiGetAccountOptions,
  DynamicApiRegisterOptions,
  DynamicApiResetPasswordOptions,
  DynamicApiUpdateAccountOptions,
} from './interfaces';

describe('AuthHelper', () => {
  class UserEntity extends BaseEntity {
    login: string;

    pass: string;

    nickname: string;
  }

  const loginField = 'login';
  const passwordField = 'pass';
  const additionalRequestFields: (keyof UserEntity)[] = ['nickname'];
  const loginCallback = jest.fn();
  const registerOptions: DynamicApiRegisterOptions<UserEntity> = {
    callback: jest.fn(),
    additionalFields: ['nickname'],
    protected: false,
  };
  const getAccountOptions: DynamicApiGetAccountOptions<UserEntity> = {
    callback: jest.fn(),
    useInterceptors: [],
  };
  const resetPasswordOptions: DynamicApiResetPasswordOptions = {
    resetPasswordCallback: jest.fn(),
    changePasswordCallback: jest.fn(),
    emailField: 'email',
    changePasswordAbilityPredicate: jest.fn(),
    expirationInMinutes: 60,
  };
  const validationPipeOptions: ValidationPipeOptions = {
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  };
  const updateAccountOptions: DynamicApiUpdateAccountOptions<UserEntity> = {
    callback: jest.fn(),
    abilityPredicate: jest.fn(),
    additionalFieldsToExclude: ['pass'],
  };

  describe('createLocalStrategyProvider', () => {
    let provider: any;
    let LocalStrategy: Type;
    const loginField = 'login';
    const passwordField = 'pass';
    const abilityPredicate = jest.fn();

    beforeEach(() => {
      provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined);
      LocalStrategy = provider.useClass;
    });

    it('should return a provider', () => {
      expect(provider).toEqual({
        provide: localStrategyProviderName,
        useClass: expect.any(Function),
      });
    });

    describe('LocalStrategy', () => {
      let strategy: any;
      let authService: any;
      const fakeReq = {};
      const fakeLogin = 'login';
      const fakePass = 'pass';

      beforeEach(() => {
        authService = {
          validateUser: jest.fn(),
        };
        strategy = new LocalStrategy(authService);
      });

      it('should have a validate method', () => {
        expect(strategy).toHaveProperty('validate');
      });

      it('should call authService.validateUser and return user if ability predicate is undefined', async () => {
        const fakeUser = { id: 1 };
        authService.validateUser.mockResolvedValueOnce(fakeUser);
        const result = await strategy.validate(fakeReq, fakeLogin, fakePass);

        expect(authService.validateUser).toHaveBeenCalledWith(fakeLogin, fakePass);
        expect(result).toStrictEqual(fakeUser);
      });

      it('should call authService.validateUser and return user if ability predicate return true', async () => {
        strategy.abilityPredicate = abilityPredicate.mockReturnValueOnce(true);
        const fakeUser = { id: 1 };
        authService.validateUser.mockResolvedValueOnce(fakeUser);
        const result = await strategy.validate(fakeReq, fakeLogin, fakePass);

        expect(authService.validateUser).toHaveBeenCalledWith(fakeLogin, fakePass);
        expect(result).toStrictEqual(fakeUser);
      });

      it('should throw a forbidden exception if ability predicate return false', async () => {
        strategy.abilityPredicate = abilityPredicate.mockReturnValueOnce(false);
        const fakeUser = { id: 1 };
        authService.validateUser.mockResolvedValueOnce(fakeUser);

        await expect(strategy.validate(fakeReq, fakeLogin, fakePass))
        .rejects
        .toThrow(new ForbiddenException('Access denied'));
      });

      it('should throw an error if authService.validateUser failed', async () => {
        authService.validateUser.mockResolvedValueOnce(null);

        await expect(strategy.validate(fakeReq, fakeLogin, fakePass))
        .rejects
        .toThrow(new UnauthorizedException('Invalid credentials'));
      });
    });

    describe('LocalStrategy with customValidate', () => {
      let strategy: any;
      let authService: any;
      const fakeReq = { body: { deviceToken: 'tok' } };
      const fakeLogin = 'login';
      const fakePass = '';

      beforeEach(() => {
        authService = { validateUser: jest.fn() };
      });

      it('should return user from customValidate without calling validateUser', async () => {
        const fakeUser = { id: 2 };
        const customValidate = jest.fn().mockResolvedValueOnce(fakeUser);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        const result = await strategy.validate(fakeReq, fakeLogin, fakePass);

        expect(customValidate).toHaveBeenCalledWith(fakeReq);
        expect(authService.validateUser).not.toHaveBeenCalled();
        expect(result).toStrictEqual(fakeUser);
      });

      it('should fallback to validateUser when customValidate returns null', async () => {
        const fakeUser = { id: 3 };
        const customValidate = jest.fn().mockResolvedValueOnce(null);
        authService.validateUser.mockResolvedValueOnce(fakeUser);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        const result = await strategy.validate(fakeReq, fakeLogin, fakePass);

        expect(customValidate).toHaveBeenCalledWith(fakeReq);
        expect(authService.validateUser).toHaveBeenCalledWith(fakeLogin, fakePass);
        expect(result).toStrictEqual(fakeUser);
      });

      it('should throw ForbiddenException from customValidate user if abilityPredicate returns false', async () => {
        const fakeUser = { id: 4 };
        const customValidate = jest.fn().mockResolvedValueOnce(fakeUser);
        const abilityPredicate = jest.fn().mockReturnValueOnce(false);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, abilityPredicate, customValidate);
        strategy = new provider.useClass(authService);

        await expect(strategy.validate(fakeReq, fakeLogin, fakePass))
          .rejects
          .toThrow(new ForbiddenException('Access denied'));
      });

      it('should throw UnauthorizedException when customValidate returns null and validateUser returns null', async () => {
        const customValidate = jest.fn().mockResolvedValueOnce(null);
        authService.validateUser.mockResolvedValueOnce(null);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        await expect(strategy.validate(fakeReq, fakeLogin, fakePass))
          .rejects
          .toThrow(new UnauthorizedException('Invalid credentials'));
      });
    });

    describe('LocalStrategy authenticate override with customValidate', () => {
      let strategy: any;
      let authService: any;

      beforeEach(() => {
        authService = { validateUser: jest.fn() };
      });

      it('should bypass passport-local missing credentials check and call success when customValidate returns a user', async () => {
        const fakeUser = { id: 5, login: 'device-user' };
        const customValidate = jest.fn().mockResolvedValueOnce(fakeUser);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        const successFn = jest.fn();
        const errorFn = jest.fn();
        strategy.success = successFn;
        strategy.error = errorFn;

        // Request with NO login/password fields at all (passwordless flow)
        const req = { body: { deviceToken: 'valid-token' } };
        strategy.authenticate(req);

        // Wait for async
        await new Promise((r) => setImmediate(r));

        expect(customValidate).toHaveBeenCalledWith(req);
        expect(authService.validateUser).not.toHaveBeenCalled();
        expect(successFn).toHaveBeenCalledWith(fakeUser);
        expect(errorFn).not.toHaveBeenCalled();
      });

      it('should bypass passport-local missing credentials check and call error when customValidate returns null and validateUser returns null', async () => {
        const customValidate = jest.fn().mockResolvedValueOnce(null);
        authService.validateUser.mockResolvedValueOnce(null);
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        const successFn = jest.fn();
        const errorFn = jest.fn();
        strategy.success = successFn;
        strategy.error = errorFn;

        const req = { body: { deviceToken: 'unknown-token' } };
        strategy.authenticate(req);

        await new Promise((r) => setImmediate(r));

        expect(customValidate).toHaveBeenCalledWith(req);
        expect(authService.validateUser).toHaveBeenCalledWith('', '');
        expect(successFn).not.toHaveBeenCalled();
        expect(errorFn).toHaveBeenCalledWith(expect.any(UnauthorizedException));
      });

      it('should use default passport-local authenticate when customValidate is not defined', () => {
        provider = createLocalStrategyProvider<UserEntity>(loginField, passwordField, undefined);
        strategy = new provider.useClass(authService);

        const superAuthenticateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(strategy)),
          'authenticate',
        ).mockImplementation(() => {});
        const req = { body: { [loginField]: 'user', [passwordField]: 'pass' } };

        strategy.authenticate(req);

        expect(superAuthenticateSpy).toHaveBeenCalledWith(req, undefined);
        superAuthenticateSpy.mockRestore();
      });
    });

    describe('LocalStrategy authenticate login alias normalization', () => {
      let strategy: any;
      let authService: any;
      const aliasLoginField = 'nickname';

      beforeEach(() => {
        authService = { validateUser: jest.fn() };
      });

      it('should map body.login to body[loginField] when loginField is not present', () => {
        const provider = createLocalStrategyProvider<UserEntity>(aliasLoginField, passwordField, undefined);
        strategy = new provider.useClass(authService);

        const superAuthenticateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(strategy)),
          'authenticate',
        ).mockImplementation(() => {});
        const req = { body: { login: 'user@test.com', [passwordField]: 'secret' } };

        strategy.authenticate(req);

        expect(req.body[aliasLoginField]).toBe('user@test.com');
        expect(superAuthenticateSpy).toHaveBeenCalledWith(req, undefined);
        superAuthenticateSpy.mockRestore();
      });

      it('should not overwrite body[loginField] when it is already present even if body.login is set', () => {
        const provider = createLocalStrategyProvider<UserEntity>(aliasLoginField, passwordField, undefined);
        strategy = new provider.useClass(authService);

        const superAuthenticateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(strategy)),
          'authenticate',
        ).mockImplementation(() => {});
        const req = { body: { [aliasLoginField]: 'original', login: 'alias', [passwordField]: 'secret' } };

        strategy.authenticate(req);

        expect(req.body[aliasLoginField]).toBe('original');
        superAuthenticateSpy.mockRestore();
      });

      it('should map body.login to body[loginField] in customValidate path', async () => {
        const fakeUser = { id: 10 };
        const customValidate = jest.fn().mockResolvedValueOnce(fakeUser);
        const provider = createLocalStrategyProvider<UserEntity>(aliasLoginField, passwordField, undefined, customValidate);
        strategy = new provider.useClass(authService);

        const successFn = jest.fn();
        const errorFn = jest.fn();
        strategy.success = successFn;
        strategy.error = errorFn;

        const req = { body: { login: 'alias@test.com', [passwordField]: 'secret' } };
        strategy.authenticate(req);

        await new Promise((r) => setImmediate(r));

        expect(req.body[aliasLoginField]).toBe('alias@test.com');
        expect(successFn).toHaveBeenCalledWith(fakeUser);
      });
    });

    describe('createLocalStrategyProvider with useStrategy', () => {
      it('should return the provided strategy class directly', () => {
        class CustomStrategy {}
        const provider = createLocalStrategyProvider<UserEntity>(
          loginField, passwordField, undefined, undefined, CustomStrategy as any,
        );

        expect(provider).toEqual({
          provide: localStrategyProviderName,
          useClass: CustomStrategy,
        });
      });

      it('should ignore loginField, passwordField and abilityPredicate when useStrategy is provided', () => {
        class CustomStrategy {}
        const abilityPredicate = jest.fn();
        const provider = createLocalStrategyProvider<UserEntity>(
          loginField, passwordField, abilityPredicate, undefined, CustomStrategy as any,
        );

        expect(provider.useClass).toBe(CustomStrategy);
        expect(abilityPredicate).not.toHaveBeenCalled();
      });
    });
  });

  describe('createAuthServiceProvider', () => {
    let provider: any;
    let AuthService: Type;

    it('should return a provider', () => {
      provider = createAuthServiceProvider<UserEntity>(
        UserEntity,
        {
          loginField,
          passwordField,
        },
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(provider).toEqual({
        provide: authServiceProviderName,
        useClass: expect.any(Function),
      });
    });

    describe('AuthService', () => {
      let authService: any;
      let model: any;
      let jwtService: any;
      let bcryptService: any;

      beforeEach(() => {
        provider = createAuthServiceProvider<UserEntity>(
          UserEntity,
          {
            loginField,
            passwordField,
            callback: loginCallback,
            additionalFields: additionalRequestFields,
          },
          getAccountOptions.callback,
          registerOptions,
          resetPasswordOptions,
          updateAccountOptions,
        );

        AuthService = provider.useClass;

        model = {
          name: 'UserEntity',
        };
        jwtService = {
          sign: jest.fn(),
        };
        bcryptService = {
          hash: jest.fn(),
          compare: jest.fn(),
        };
        authService = new AuthService(model, jwtService, bcryptService);
      });

      it(
        'should have additionalRequestFields, loginField, passwordField, registerCallback, loginCallback and resetPasswordOptions properties',
        () => {
          expect(authService).toHaveProperty('additionalRequestFields', additionalRequestFields);
          expect(authService).toHaveProperty('loginField', loginField);
          expect(authService).toHaveProperty('passwordField', passwordField);
          expect(authService).toHaveProperty('registerCallback', registerOptions.callback);
          expect(authService).toHaveProperty('loginCallback', loginCallback);
          expect(authService).toHaveProperty('resetPasswordOptions', resetPasswordOptions);
        },
      );

      it('should call super with model, jwtService and bcryptService', () => {
        expect(authService).toHaveProperty('model', model);
        expect(authService).toHaveProperty('jwtService', jwtService);
        expect(authService).toHaveProperty('bcryptService', bcryptService);
      });
    });
  });

  describe('createAuthController', () => {
    let AuthController: Type;
    const service = {} as AuthService<UserEntity>;
    const broadcastService = createMock<DynamicApiBroadcastService>();
    const jwtService = createMock<JwtService>();

    it('should return a controller', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField, additionalFields: additionalRequestFields },
        { getAccountOptions, registerOptions, validationPipeOptions, resetPasswordOptions, updateAccountOptions },
      );

      expect(AuthController).toEqual(expect.any(Function));
      expect(AuthController.name).toBe('AuthController');
    });

    it('should have a constructor with service property', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField, additionalFields: undefined },
      );

      const authController = new AuthController(service);
      expect(authController).toHaveProperty('service', service);
    });

    it('should have a constructor with broadcastService and jwtService properties', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField },
      );

      const authController = new AuthController(service, broadcastService, jwtService);
      expect(authController).toHaveProperty('service', service);
      expect(authController).toHaveProperty('broadcastService', broadcastService);
      expect(authController).toHaveProperty('jwtService', jwtService);
    });

    it('should return a controller with refreshTokenOptions', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField },
        { refreshTokenOptions: { refreshTokenField: 'nickname' as keyof UserEntity } },
      );

      expect(AuthController).toEqual(expect.any(Function));
      expect(AuthController.name).toBe('AuthController');
    });
  });

  describe('createAuthGateway', () => {
    let Gateway: Type;
    const service = {} as AuthService<UserEntity>;
    const jwtService = {} as JwtService;

    it('should return a gateway', () => {
      Gateway = createAuthGateway(
        UserEntity,
        { loginField, passwordField, additionalFields: additionalRequestFields },
        { namespace: 'auth', validationPipeOptions, getAccountOptions, registerOptions, resetPasswordOptions, updateAccountOptions },
      );

      expect(Gateway).toEqual(expect.any(Function));
      expect(Gateway.name).toBe('AuthGateway');
    });

    it('should have a constructor with service and jwtService properties', () => {
      Gateway = createAuthGateway(
        UserEntity,
        { loginField, passwordField },
        { namespace: 'auth' },
      );

      const gateway = new Gateway(service, jwtService);
      expect(gateway).toHaveProperty('service', service);
      expect(gateway).toHaveProperty('jwtService', jwtService);
    });

    it('should return a gateway with refreshTokenOptions', () => {
      Gateway = createAuthGateway(
        UserEntity,
        { loginField, passwordField },
        { namespace: 'auth', refreshTokenOptions: { refreshTokenField: 'nickname' as keyof UserEntity } },
      );

      expect(Gateway).toEqual(expect.any(Function));
      expect(Gateway.name).toBe('AuthGateway');
    });
  });
});
