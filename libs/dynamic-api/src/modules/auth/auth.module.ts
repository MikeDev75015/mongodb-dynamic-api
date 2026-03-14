import * as cookieParser from 'cookie-parser';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { createDynamicApiBroadcastGateway } from '../../gateways';
import { buildSchemaFromEntity, initializeConfigFromOptions } from '../../helpers';
import { GatewayOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService, DynamicApiBroadcastService } from '../../services';
import { authGatewayProviderName, createAuthController, createAuthGateway, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { DynamicApiAuthOptions, DynamicApiResetPasswordOptions } from './interfaces';
import { JwtRefreshStrategy, JwtStrategy } from './strategies';

@Module({})
export class AuthModule implements NestModule {
  private static useCookie = false;

  configure(consumer: MiddlewareConsumer) {
    if (AuthModule.useCookie) {
      consumer.apply(cookieParser()).forRoutes('*');
    }
  }

  static forRoot<Entity extends BaseEntity>(
    options: DynamicApiAuthOptions<Entity>,
  ) {
    const {
      userEntity,
      login: {
        loginField,
        passwordField,
        ...login
      },
      getAccount,
      register,
      updateAccount,
      resetPassword,
      refreshToken,
      jwt: { secret, expiresIn },
      validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    } = this.initializeAuthOptions<Entity>(options);

    AuthModule.useCookie = refreshToken?.useCookie ?? false;

    const { resetPasswordCallback, ...resetPasswordOptionsRest } = resetPassword;
    const resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined = resetPasswordCallback
      ? { resetPasswordCallback, ...resetPasswordOptionsRest }
      : undefined;

    const AuthController = createAuthController(
      userEntity,
      { loginField, passwordField, ...login },
      getAccount,
      register,
      validationPipeOptions,
      resetPasswordOptions,
      updateAccount,
      refreshToken,
    );
    const AuthServiceProvider = createAuthServiceProvider(
      userEntity,
      { loginField, passwordField, ...login },
      getAccount?.callback,
      register,
      resetPasswordOptions,
      updateAccount,
      refreshToken,
    );
    const LocalStrategyProvider = createLocalStrategyProvider(
      loginField, passwordField, login.abilityPredicate,
    );

    const schema = buildSchemaFromEntity(userEntity);
    DynamicApiGlobalStateService.addEntitySchema(userEntity, schema);

    const gatewayOptions = initializeConfigFromOptions(
      webSocket ?? DynamicApiModule.state.get('gatewayOptions'),
    );

    const hasBroadcast = !!(login?.broadcast || register?.broadcast || getAccount?.broadcast || updateAccount?.broadcast);

    const broadcastProviders = hasBroadcast ? [
      DynamicApiBroadcastService,
      createDynamicApiBroadcastGateway(
        DynamicApiModule.state.get<GatewayOptions>('broadcastGatewayOptions') ?? {},
      ),
    ] : [];

    const webSocketsProviders = !gatewayOptions ? [] : [
      {
        provide: authGatewayProviderName,
        useClass: createAuthGateway(
          userEntity,
          {
            loginField,
            passwordField,
            ...login,
          },
          getAccount,
          register,
          resetPasswordOptions,
          updateAccount,
          { ...gatewayOptions, validationPipeOptions },
          refreshToken,
        ),
      },
    ];

    return {
      module: AuthModule,
      imports: [
        ...extraImports,
        MongooseModule.forFeature(
          [
            {
              name: userEntity.name,
              schema,
            },
          ],
          DynamicApiModule.state.get('connectionName'),
        ),
        PassportModule,
        JwtModule.register({
          global: true,
          secret,
          signOptions: { expiresIn: expiresIn as number | StringValue },
        }),
      ],
      providers: [
        AuthServiceProvider,
        LocalStrategyProvider,
        JwtStrategy,
        JwtRefreshStrategy,
        BcryptService,
        ...broadcastProviders,
        ...webSocketsProviders,
        ...extraProviders,
      ],
      controllers: [AuthController, ...extraControllers],
    };
  }

  private static initializeAuthOptions<Entity extends BaseEntity>({
    userEntity,
    jwt,
    login,
    register,
    updateAccount,
    getAccount,
    resetPassword,
    refreshToken,
    validationPipeOptions,
    webSocket,
    extraImports = [],
    extraProviders = [],
    extraControllers = [],
  }: DynamicApiAuthOptions<Entity>): DynamicApiAuthOptions<Entity> {
    return {
      userEntity: userEntity,
      jwt: {
        secret: jwt?.secret ?? 'dynamic-api-jwt-secret',
        expiresIn: jwt?.expiresIn ?? '15m',
        refreshTokenExpiresIn: jwt?.refreshTokenExpiresIn ?? '7d',
        refreshSecret: jwt?.refreshSecret,
      },
      login: {
        ...login,
        loginField: (login?.loginField ?? 'email') as keyof Entity,
        passwordField: (login?.passwordField ?? 'password') as keyof Entity,
        additionalFields: login?.additionalFields ?? [],
      },
      getAccount: {
        ...getAccount,
        useInterceptors: getAccount?.useInterceptors ?? [],
      },
      register: {
        ...register,
        additionalFields: register?.additionalFields ?? [],
        protected: register?.protected ?? !!register?.abilityPredicate,
      },
      updateAccount: {
        ...updateAccount,
        additionalFieldsToExclude: updateAccount?.additionalFieldsToExclude ?? [],
      },
      resetPassword: {
        ...resetPassword,
        emailField: (!resetPassword?.emailField ? 'email' as keyof Entity : String(resetPassword.emailField)),
        expirationInMinutes: resetPassword?.expirationInMinutes ?? 10,
      },
      refreshToken: {
        ...refreshToken,
        useInterceptors: refreshToken?.useInterceptors ?? [],
        refreshTokenField: refreshToken?.refreshTokenField,
        useCookie: refreshToken?.useCookie ?? false,
      },
      validationPipeOptions: validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    };
  }
}
