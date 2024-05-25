import { DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Schema } from 'mongoose';
import { DynamicApiModule } from '../../dynamic-api.module';
import * as Helpers from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService } from '../../services';
import * as AuthHelpers from './auth.helper';
import { AuthModule } from './auth.module';
import { DynamicApiAuthOptions } from './interfaces';
import { JwtStrategy } from './strategies';

jest.mock(
  '@nestjs/mongoose',
  () => (
    {
      ...jest.requireActual('@nestjs/mongoose'),
      MongooseModule: { forFeature: jest.fn() },
    }
  ),
);
jest.mock(
  '@nestjs/passport',
  () => (
    { PassportModule: { register: jest.fn() } }
  ),
);
jest.mock(
  '../../dynamic-api.module',
  () => (
    { DynamicApiModule: { state: { get: jest.fn() } } }
  ),
);
jest.mock(
  '../../helpers',
  () => (
    { buildSchemaFromEntity: jest.fn() }
  ),
);
jest.mock(
  '../../services',
  () => (
    { BcryptService: jest.fn(), DynamicApiGlobalStateService: { addEntitySchema: jest.fn() } }
  ),
);
jest.mock(
  './auth.helper',
  () => (
    { createAuthController: jest.fn(), createAuthServiceProvider: jest.fn(), createLocalStrategyProvider: jest.fn() }
  ),
);
jest.mock(
  './strategies',
  () => (
    { JwtStrategy: jest.fn() }
  ),
);

class UserEntity extends BaseEntity {
  name: string;

  email: string;

  password: string;
}

describe('AuthModule', () => {
  let module: DynamicModule;
  let spyInitializeAuthOptions: jest.SpyInstance;
  const basicOptions: DynamicApiAuthOptions<UserEntity> = { userEntity: UserEntity };
  const fullOptions: DynamicApiAuthOptions<UserEntity> = {
    userEntity: UserEntity,
    login: {
      loginField: 'name',
      passwordField: 'password',
      additionalFields: [],
      abilityPredicate: jest.fn(),
      callback: jest.fn(),
    },
    register: {
      additionalFields: [],
      protected: false,
      abilityPredicate: jest.fn(),
      callback: jest.fn(),
    },
    resetPassword: {
      resetPasswordCallback: jest.fn(),
      changePasswordCallback: jest.fn(),
      emailField: 'email',
      expirationInMinutes: 30,
      abilityPredicate: jest.fn(),
    },
    jwt: { secret: 'secret', expiresIn: '1h' },
    validationPipeOptions: { whitelist: true },
  };

  let spyBuildSchemaFromEntity: jest.SpyInstance;
  let spyMongooseModuleForFeature: jest.SpyInstance;
  let spyDynamicApiModuleStateGet: jest.SpyInstance;
  let spyJwtModuleRegister: jest.SpyInstance;
  let spyCreateAuthController: jest.SpyInstance;
  let spyCreateAuthServiceProvider: jest.SpyInstance;
  let spyCreateLocalStrategyProvider: jest.SpyInstance;
  let addEntitySchemaSpy: jest.SpyInstance;

  const AuthController = jest.fn();
  const AuthServiceProvider = { provide: 'authServiceProviderName', useClass: jest.fn() };
  const LocalStrategyProvider = { provide: 'localStrategyProviderName', useClass: jest.fn() };
  const fakeMongooseDynamicModule = { module: 'MongooseDynamicModule' } as unknown as DynamicModule;
  const fakeJwtDynamicModule = { module: 'JwtDynamicModule' } as unknown as DynamicModule;
  const fakeSchema = {} as Schema;
  const fakeConnectionName = 'ut-connection-name';

  const fakeMongooseModuleForFeature = jest.fn(() => fakeMongooseDynamicModule);
  const fakeDynamicApiModuleStateGet = jest.fn(() => fakeConnectionName);
  const fakeJwtModuleRegister = jest.fn(() => fakeJwtDynamicModule);

  beforeEach(() => {
    spyInitializeAuthOptions = jest.spyOn<any, any>(AuthModule, 'initializeAuthOptions');
    spyBuildSchemaFromEntity =
      jest.spyOn(Helpers, 'buildSchemaFromEntity').mockImplementationOnce(() => fakeSchema);
    spyMongooseModuleForFeature =
      jest.spyOn(MongooseModule, 'forFeature').mockImplementationOnce(fakeMongooseModuleForFeature);
    spyDynamicApiModuleStateGet =
      jest.spyOn(DynamicApiModule.state, 'get').mockImplementationOnce(fakeDynamicApiModuleStateGet);
    spyJwtModuleRegister = jest.spyOn(JwtModule, 'register').mockImplementationOnce(fakeJwtModuleRegister);

    spyCreateAuthController =
      jest.spyOn(AuthHelpers, 'createAuthController').mockImplementationOnce(jest.fn(() => AuthController));
    spyCreateAuthServiceProvider =
      jest.spyOn(AuthHelpers, 'createAuthServiceProvider').mockImplementationOnce(jest.fn(() => AuthServiceProvider));
    spyCreateLocalStrategyProvider =
      jest.spyOn(AuthHelpers, 'createLocalStrategyProvider')
      .mockImplementationOnce(jest.fn(() => LocalStrategyProvider));
    addEntitySchemaSpy = jest
    .spyOn(DynamicApiGlobalStateService, 'addEntitySchema');
  });

  describe('forRoot', () => {
    describe('with default options', () => {
      beforeEach(() => {
        module = AuthModule.forRoot(basicOptions);
      });

      it('should return dynamic module', () => {
        expect(module).toBeDefined();
        expect(module.module).toBe(AuthModule);
      });

      it('should have initialized options', () => {
        expect(spyInitializeAuthOptions).toHaveBeenCalledWith(basicOptions);
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
            additionalFields: [],
            protected: false,
          },
          undefined,
          undefined,
        );

        expect(spyCreateAuthServiceProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthServiceProvider).toHaveBeenCalledWith(
          UserEntity,
          {
            loginField: 'email',
            passwordField: 'password',
            additionalFields: [],
          },
          undefined,
          undefined,
        );

        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledWith('email', 'password', undefined);
      });

      it('should have imports', () => {
        expect(module.imports).toEqual([
          fakeMongooseDynamicModule,
          PassportModule,
          fakeJwtDynamicModule,
        ]);

        expect(spyBuildSchemaFromEntity).toHaveBeenCalledWith(UserEntity);
        expect(spyMongooseModuleForFeature)
        .toHaveBeenCalledWith([{ name: UserEntity.name, schema: fakeSchema }], fakeConnectionName);
        expect(spyDynamicApiModuleStateGet).toHaveBeenCalled();
        expect(spyJwtModuleRegister)
        .toHaveBeenCalledWith({
          global: true,
          secret: 'dynamic-api-jwt-secret',
          signOptions: { expiresIn: '1d' },
        });
      });

      it('should have providers', () => {
        expect(module.providers).toEqual([
          AuthServiceProvider,
          LocalStrategyProvider,
          JwtStrategy,
          BcryptService,
        ]);
      });
    });

    describe('with full options', () => {
      const fakeImport = { module: 'fake-import' } as unknown as DynamicModule;

      beforeEach(() => {
        module = AuthModule.forRoot(fullOptions, [fakeImport]);
      });

      it('should have initialized options', () => {
        expect(spyInitializeAuthOptions).toHaveBeenCalledWith(fullOptions);
      });

      it('should create auth controller, auth service provider and local strategy provider', () => {
        expect(spyCreateAuthController).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthController).toHaveBeenCalledWith(
          UserEntity,
          fullOptions.login,
          fullOptions.register,
          fullOptions.validationPipeOptions,
          fullOptions.resetPassword,
        );

        expect(spyCreateAuthServiceProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateAuthServiceProvider).toHaveBeenCalledWith(
          UserEntity,
          fullOptions.login,
          fullOptions.register.callback,
          fullOptions.resetPassword,
        );

        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledTimes(1);
        expect(spyCreateLocalStrategyProvider).toHaveBeenCalledWith(
          fullOptions.login.loginField,
          fullOptions.login.passwordField,
          fullOptions.login.abilityPredicate,
        );
      });

      it('should have imports', () => {
        expect(module.imports).toEqual([
          fakeImport,
          fakeMongooseDynamicModule,
          PassportModule,
          fakeJwtDynamicModule,
        ]);

        expect(spyBuildSchemaFromEntity).toHaveBeenCalledWith(UserEntity);
        expect(spyMongooseModuleForFeature)
        .toHaveBeenCalledWith([{ name: UserEntity.name, schema: fakeSchema }], fakeConnectionName);
        expect(spyDynamicApiModuleStateGet).toHaveBeenCalled();
        expect(spyJwtModuleRegister)
        .toHaveBeenCalledWith({
          global: true,
          secret: fullOptions.jwt.secret,
          signOptions: { expiresIn: fullOptions.jwt.expiresIn },
        });
      });
    });
  });
});
