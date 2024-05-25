import { ForbiddenException, Type, UnauthorizedException, ValidationPipeOptions } from '@nestjs/common';
import { describe } from 'node:test';
import { BaseEntity } from '../../models';
import {
  authServiceProviderName,
  createAuthController,
  createAuthServiceProvider,
  createLocalStrategyProvider,
  localStrategyProviderName,
} from './auth.helper';
import { AuthService, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions } from './interfaces';

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
  const resetPasswordOptions: DynamicApiResetPasswordOptions = {
    resetPasswordCallback: jest.fn(),
    changePasswordCallback: jest.fn(),
    emailField: 'email',
    abilityPredicate: jest.fn(),
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
        const result = await strategy.validate(fakeLogin, fakePass);

        expect(authService.validateUser).toHaveBeenCalledWith(fakeLogin, fakePass);
        expect(result).toStrictEqual(fakeUser);
      });

      it('should call authService.validateUser and return user if ability predicate return true', async () => {
        strategy.abilityPredicate = abilityPredicate.mockReturnValueOnce(true);
        const fakeUser = { id: 1 };
        authService.validateUser.mockResolvedValueOnce(fakeUser);
        const result = await strategy.validate(fakeLogin, fakePass);

        expect(authService.validateUser).toHaveBeenCalledWith(fakeLogin, fakePass);
        expect(result).toStrictEqual(fakeUser);
      });

      it('should throw a forbidden exception if ability predicate return false', async () => {
        strategy.abilityPredicate = abilityPredicate.mockReturnValueOnce(false);
        const fakeUser = { id: 1 };
        authService.validateUser.mockResolvedValueOnce(fakeUser);

        await expect(strategy.validate(fakeLogin, fakePass))
        .rejects
        .toThrow(new ForbiddenException('Access denied'));
      });

      it('should throw an error if authService.validateUser failed', async () => {
        authService.validateUser.mockResolvedValueOnce(null);

        await expect(strategy.validate(fakeLogin, fakePass))
        .rejects
        .toThrow(new UnauthorizedException('Invalid credentials'));
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
          registerOptions.callback,
          resetPasswordOptions,
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

    it('should return a controller', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField, additionalFields: additionalRequestFields },
        registerOptions,
        validationPipeOptions,
        resetPasswordOptions,
      );

      expect(AuthController).toEqual(expect.any(Function));
      expect(AuthController.name).toBe('AuthController');
    });

    it('should have a constructor with service property', () => {
      AuthController = createAuthController(
        UserEntity,
        { loginField, passwordField, additionalFields: undefined },
        undefined,
        undefined,
        undefined,
      );

      const authController = new AuthController(service);
      expect(authController).toHaveProperty('service', service);
    });
  });
});
