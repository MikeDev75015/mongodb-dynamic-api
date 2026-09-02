import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Schema } from 'mongoose';
import { getFullAuthOptionsMock } from '../../../__mocks__/auth-full-options.mock';
import { DynamicApiModule } from '../../dynamic-api.module';
import * as Helpers from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService, DynamicApiBroadcastService } from '../../services';
import * as AuthHelpers from './auth.helper';
import { authGatewayProviderName } from './auth.helper';
import { AuthModule } from './auth.module';
import { DynamicApiAuthOptions } from './interfaces';
import { JwtRefreshStrategy, JwtStrategy } from './strategies';

vi.mock(
  '@nestjs/mongoose',
  async (importOriginal) => (
    {
      ...(await importOriginal<typeof import('@nestjs/mongoose')>()),
      MongooseModule: { forFeature: vi.fn() },
    }
  ),
);
vi.mock(
  '@nestjs/passport',
  () => (
    { PassportModule: { register: vi.fn() } }
  ),
);
vi.mock(
  '../../dynamic-api.module',
  () => (
    { DynamicApiModule: { state: { get: vi.fn() } } }
  ),
);
vi.mock(
  '../../helpers',
  () => (
    {
      buildSchemaFromEntity: vi.fn(),
      initializeConfigFromOptions: vi.fn(),
    }
  ),
);
vi.mock(
  '../../gateways',
  () => (
    { createDynamicApiBroadcastGateway: vi.fn(() => vi.fn()) }
  ),
);
vi.mock(
  '../../services',
  () => (
    { BcryptService: vi.fn(), DynamicApiGlobalStateService: { addEntitySchema: vi.fn() }, DynamicApiBroadcastService: vi.fn() }
  ),
);
vi.mock(
  './auth.helper',
  () => (
    {
      createAuthController: vi.fn(),
      createAuthServiceProvider: vi.fn(),
      createLocalStrategyProvider: vi.fn(),
      createAuthGateway: vi.fn(),
      // Not stubbed originally under Jest, which silently returned undefined for a mock factory's
      // missing property; Vitest throws instead ("No ... export is defined on the mock") since this
      // plain string constant is imported directly by this spec (not just used internally by the
      // module under test) — real value from auth.helper.ts, must match on both sides of the mock.
      authGatewayProviderName: 'DynamicApiAuthGateway',
    }
  ),
);
vi.mock(
  './strategies',
  () => (
    { JwtStrategy: vi.fn(), JwtRefreshStrategy: vi.fn() }
  ),
);

class UserEntity extends BaseEntity {
  name: string;

  email: string;

  password: string;
}

describe('AuthModule', () => {
  let module: DynamicModule;
  let spyInitializeAuthOptions: Mock;

  const basicOptions: DynamicApiAuthOptions<UserEntity> = { userEntity: UserEntity };

  const fakeGatewayOptions = { namespace: 'namespace' };
  const fakeImport = { module: 'fake-import' } as unknown as DynamicModule;
  const fakeProvider = { provide: 'fake-provider', useValue: {} };
  const fakeController = vi.fn();

  const fullOptions = getFullAuthOptionsMock(
    UserEntity,
    'email',
    'password',
    ['name'],
    ['name', 'email'],
    ['password'],
    [fakeImport],
    [fakeProvider],
    [fakeController],
  );

  let spyBuildSchemaFromEntity: Mock;
  let spyInitializeConfigFromOptions: Mock;
  let spyMongooseModuleForFeature: Mock;
  let spyDynamicApiModuleStateGet: Mock;
  let spyJwtModuleRegister: Mock;
  let spyPassportModuleRegister: Mock;
  let spyCreateAuthController: Mock;
  let spyCreateAuthServiceProvider: Mock;
  let spyCreateLocalStrategyProvider: Mock;
  let spyCreateAuthGateway: Mock;
  let addEntitySchemaSpy: Mock;

  const AuthController = vi.fn();
  const AuthServiceProvider = { provide: 'authServiceProviderName', useClass: vi.fn() };
  const LocalStrategyProvider = { provide: 'localStrategyProviderName', useClass: vi.fn() };
  const AuthGateway = vi.fn();
  const fakeMongooseDynamicModule = { module: 'MongooseDynamicModule' } as unknown as DynamicModule;
  const fakeJwtDynamicModule = { module: 'JwtDynamicModule' } as unknown as DynamicModule;
  const fakePassportDynamicModule = { module: 'PassportDynamicModule' } as unknown as DynamicModule;
  const fakeSchema = {} as Schema;
  const fakeConnectionName = 'ut-connection-name';

  const fakeMongooseModuleForFeature = vi.fn(() => fakeMongooseDynamicModule);
  const fakeDynamicApiModuleStateGet = vi.fn(() => fakeConnectionName);
  const fakeJwtModuleRegister = vi.fn(() => fakeJwtDynamicModule);
  const fakePassportModuleRegister = vi.fn(() => fakePassportDynamicModule);

  beforeEach(() => {
    spyInitializeAuthOptions = vi.spyOn<any, any>(AuthModule, 'initializeAuthOptions');
    spyBuildSchemaFromEntity =
      vi.spyOn(Helpers, 'buildSchemaFromEntity').mockImplementationOnce(() => fakeSchema);
    spyMongooseModuleForFeature =
      vi.spyOn(MongooseModule, 'forFeature').mockImplementationOnce(fakeMongooseModuleForFeature);
    spyDynamicApiModuleStateGet =
      vi.spyOn(DynamicApiModule.state, 'get').mockImplementation(fakeDynamicApiModuleStateGet);
    spyJwtModuleRegister = vi.spyOn(JwtModule, 'register').mockImplementationOnce(fakeJwtModuleRegister);
    spyPassportModuleRegister =
      vi.spyOn(PassportModule, 'register').mockImplementationOnce(fakePassportModuleRegister);

    spyCreateAuthController =
      vi.spyOn(AuthHelpers, 'createAuthController').mockImplementationOnce(vi.fn(() => AuthController));
    spyCreateAuthServiceProvider =
      vi.spyOn(AuthHelpers, 'createAuthServiceProvider').mockImplementationOnce(vi.fn(() => AuthServiceProvider));
    spyCreateLocalStrategyProvider =
      vi.spyOn(AuthHelpers, 'createLocalStrategyProvider')
      .mockImplementationOnce(vi.fn(() => LocalStrategyProvider));
    spyCreateAuthGateway =
      vi.spyOn(AuthHelpers, 'createAuthGateway').mockImplementationOnce(vi.fn(() => AuthGateway));
    addEntitySchemaSpy = vi
    .spyOn(DynamicApiGlobalStateService, 'addEntitySchema');
  });

  describe('forRoot', () => {
    describe('with default options', () => {
      beforeEach(() => {
        module = AuthModule.forRoot(basicOptions);
        spyInitializeConfigFromOptions =
          vi.spyOn(Helpers, 'initializeConfigFromOptions').mockImplementationOnce(() => undefined);
      });

      it('should return dynamic module', () => {
        expect(module).toBeDefined();
        expect(module.module).toBe(AuthModule);
      });

      it('should have initialized options', () => {
        expect(spyInitializeAuthOptions).toHaveBeenCalledWith(basicOptions);
        expect(spyInitializeConfigFromOptions).toHaveBeenCalledWith(fakeConnectionName);
      });

      it('should add entity schema', () => {
        expect(addEntitySchemaSpy).toHaveBeenCalledWith(UserEntity, fakeSchema);
      });

      it('should create auth controller, auth service provider and local strategy provider', () => {
        expect(spyCreateAuthController).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthController).toHaveBeenCalledWith(
          UserEntity,
          {
            loginField: 'email',
            passwordField: 'password',
            additionalFields: [],
          },
          {
            getAccountOptions: { useInterceptors: [] },
            registerOptions: { additionalFields: [], protected: false },
            validationPipeOptions: undefined,
            resetPasswordOptions: undefined,
            updateAccountOptions: { additionalFieldsToExclude: [] },
            refreshTokenOptions: { useInterceptors: [], refreshTokenField: undefined, useCookie: false },
            passwordlessOptions: undefined,
          },
        );

        expect(spyCreateAuthServiceProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthServiceProvider).toHaveBeenCalledWith(
          UserEntity,
          {
            loginOptions: {
              loginField: 'email',
              passwordField: 'password',
              additionalFields: [],
            },
            getAccountCallback: undefined,
            register: { additionalFields: [], protected: false },
            resetPasswordOptions: undefined,
            updateAccount: { additionalFieldsToExclude: [] },
            refreshToken: { useInterceptors: [], refreshTokenField: undefined, useCookie: false },
            passwordlessOptions: undefined,
          },
        );

        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledWith('email', 'password', undefined, undefined, undefined);
      });

      it('should have imports', () => {
        expect(module.imports).toEqual([
          fakeMongooseDynamicModule,
          fakePassportDynamicModule,
          fakeJwtDynamicModule,
        ]);

        expect(spyBuildSchemaFromEntity).toHaveBeenCalledWith(UserEntity);
        expect(spyMongooseModuleForFeature)
        .toHaveBeenCalledWith([{ name: UserEntity.name, schema: fakeSchema }], 'ut-connection-name');
        expect(spyDynamicApiModuleStateGet).toHaveBeenCalled();
        expect(spyPassportModuleRegister).toHaveBeenCalledWith({});
        expect(spyJwtModuleRegister)
        .toHaveBeenCalledWith({
          global: true,
          secret: 'dynamic-api-jwt-secret',
          signOptions: { expiresIn: '15m' },
        });
      });

      it('should have providers', () => {
        expect(module.providers).toEqual([
          AuthServiceProvider,
          LocalStrategyProvider,
          JwtStrategy,
          JwtRefreshStrategy,
          BcryptService,
        ]);
      });
    });

    describe('with full options', () => {
      beforeEach(() => {
        module = AuthModule.forRoot(fullOptions);
        spyInitializeConfigFromOptions =
          vi.spyOn(Helpers, 'initializeConfigFromOptions').mockImplementationOnce(() => fakeGatewayOptions);
      });

      it('should have initialized options', () => {
        expect(spyInitializeAuthOptions).toHaveBeenCalledWith(fullOptions);
        expect(spyInitializeConfigFromOptions).toHaveBeenCalledWith(fakeGatewayOptions);
      });

      it('should create auth controller, auth service provider and local strategy provider', () => {
        expect(spyCreateAuthController).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthController).toHaveBeenCalledWith(
          UserEntity,
          fullOptions.login,
          {
            getAccountOptions: fullOptions.getAccount,
            registerOptions: fullOptions.register,
            validationPipeOptions: fullOptions.validationPipeOptions,
            resetPasswordOptions: fullOptions.resetPassword,
            updateAccountOptions: fullOptions.updateAccount,
            refreshTokenOptions: fullOptions.refreshToken,
            passwordlessOptions: undefined,
          },
        );

        expect(spyCreateAuthServiceProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthServiceProvider).toHaveBeenCalledWith(
          UserEntity,
          {
            loginOptions: fullOptions.login,
            getAccountCallback: fullOptions.getAccount.callback,
            register: fullOptions.register,
            resetPasswordOptions: fullOptions.resetPassword,
            updateAccount: fullOptions.updateAccount,
            refreshToken: fullOptions.refreshToken,
            passwordlessOptions: undefined,
          },
        );

        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledWith(
          fullOptions.login.loginField,
          fullOptions.login.passwordField,
          fullOptions.login.abilityPredicate,
          fullOptions.login.customValidate,
          fullOptions.login.useStrategy,
        );

        expect(spyCreateAuthGateway).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthGateway).toHaveBeenCalledWith(
          UserEntity,
          fullOptions.login,
          {
            ...fakeGatewayOptions,
            validationPipeOptions: fullOptions.validationPipeOptions,
            getAccountOptions: fullOptions.getAccount,
            registerOptions: fullOptions.register,
            resetPasswordOptions: fullOptions.resetPassword,
            updateAccountOptions: fullOptions.updateAccount,
            refreshTokenOptions: fullOptions.refreshToken,
          },
        );
      });

      it('should have imports', () => {
        expect(module.imports).toEqual([
          fakeImport,
          fakeMongooseDynamicModule,
          fakePassportDynamicModule,
          fakeJwtDynamicModule,
        ]);

        expect(spyBuildSchemaFromEntity).toHaveBeenCalledWith(UserEntity);
        expect(spyMongooseModuleForFeature)
        .toHaveBeenCalledWith([{ name: UserEntity.name, schema: fakeSchema }], fakeConnectionName);
        expect(spyDynamicApiModuleStateGet).toHaveBeenCalled();
        expect(spyPassportModuleRegister).toHaveBeenCalledWith({});
        expect(spyJwtModuleRegister)
        .toHaveBeenCalledWith({
          global: true,
          secret: fullOptions.jwt.secret,
          signOptions: { expiresIn: fullOptions.jwt.expiresIn },
        });
      });

      it('should have providers', () => {
        expect(module.providers).toEqual([
          AuthServiceProvider,
          LocalStrategyProvider,
          JwtStrategy,
          JwtRefreshStrategy,
          BcryptService,
          {
            provide: authGatewayProviderName,
            useClass: AuthGateway,
          },
          fakeProvider,
        ]);
      });

      it('should have controllers', () => {
        expect(module.controllers).toEqual([AuthController, fakeController]);
      });
    });

    describe('with broadcast options', () => {
      const broadcastOptions: DynamicApiAuthOptions<UserEntity> = {
        userEntity: UserEntity,
        login: {
          loginField: 'email',
          passwordField: 'password',
          broadcast: { enabled: true },
        },
      };

      beforeEach(() => {
        module = AuthModule.forRoot(broadcastOptions);
        spyInitializeConfigFromOptions =
          vi.spyOn(Helpers, 'initializeConfigFromOptions').mockImplementationOnce(() => undefined);
      });

      it('should include DynamicApiBroadcastService in providers when broadcast is configured', () => {
        expect(module.providers).toEqual(
          expect.arrayContaining([DynamicApiBroadcastService]),
        );
      });

      it('should not include DynamicApiBroadcastService when no broadcast is configured', () => {
        const moduleWithoutBroadcast = AuthModule.forRoot(basicOptions);

        expect(moduleWithoutBroadcast.providers).not.toEqual(
          expect.arrayContaining([DynamicApiBroadcastService]),
        );
      });
    });
  });
});
