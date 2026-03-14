import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { buildSchemaFromEntity, initializeConfigFromOptions } from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService } from '../../services';
import { authGatewayProviderName, createAuthController, createAuthGateway, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { DynamicApiAuthOptions, DynamicApiResetPasswordOptions } from './interfaces';
import { JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
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
      jwt: { secret, expiresIn },
      validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    } = this.initializeAuthOptions<Entity>(options);

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
    );
    const AuthServiceProvider = createAuthServiceProvider(
      userEntity,
      { loginField, passwordField, ...login },
      getAccount?.callback,
      register,
      resetPasswordOptions,
      updateAccount,
    );
    const LocalStrategyProvider = createLocalStrategyProvider(
      loginField, passwordField, login.abilityPredicate,
    );

    const schema = buildSchemaFromEntity(userEntity);
    DynamicApiGlobalStateService.addEntitySchema(userEntity, schema);

    const gatewayOptions = initializeConfigFromOptions(
      webSocket ?? DynamicApiModule.state.get('gatewayOptions'),
    );

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
          signOptions: { expiresIn: expiresIn as any },
        }),
      ],
      providers: [
        AuthServiceProvider,
        LocalStrategyProvider,
        JwtStrategy,
        BcryptService,
        ...webSocketsProviders,
        ...extraProviders,
      ],
      controllers: [AuthController, ...extraControllers],
    };
  }

  /**
   * Initializes the auth options with default values.
   * @param {DynamicApiAuthOptions} useAuth - The auth options.
   * @returns {DynamicApiAuthOptions} - The initialized auth options.
   */
  private static initializeAuthOptions<Entity extends BaseEntity>({
    userEntity,
    jwt,
    login,
    register,
    updateAccount,
    getAccount,
    resetPassword,
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
        expiresIn: jwt?.expiresIn ?? '1d',
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
      validationPipeOptions: validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    };
  }
}
