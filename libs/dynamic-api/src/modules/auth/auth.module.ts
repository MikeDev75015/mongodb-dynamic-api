import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { buildSchemaFromEntity } from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService } from '../../services';
import { createAuthController, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { DynamicApiAuthOptions, DynamicApiResetPasswordOptions } from './interfaces';
import { JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
  static forRoot<Entity extends BaseEntity>(
    options: DynamicApiAuthOptions<Entity>,
    extraImports: any[] = [],
  ) {
    const {
      userEntity,
      login: {
        loginField,
        passwordField,
        ...login
      },
      register,
      resetPassword,
      jwt: { secret, expiresIn },
      validationPipeOptions,
    } = this.initializeAuthOptions<Entity>(options);

    const {
      resetPasswordCallback,
      changePasswordCallback,
      emailField,
      expirationInMinutes,
      abilityPredicate,
    } = resetPassword;
    const resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined = resetPasswordCallback
      ? { resetPasswordCallback, changePasswordCallback, emailField, expirationInMinutes, abilityPredicate }
      : undefined;

    const AuthController = createAuthController(
      userEntity,
      { loginField, passwordField, ...login },
      register,
      validationPipeOptions,
      resetPasswordOptions,
    );
    const AuthServiceProvider = createAuthServiceProvider(
      userEntity,
      { loginField, passwordField, ...login },
      register.callback,
      resetPasswordOptions,
    );
    const LocalStrategyProvider = createLocalStrategyProvider(
      loginField, passwordField, login.abilityPredicate,
    );

    const schema = buildSchemaFromEntity(userEntity);
    DynamicApiGlobalStateService.addEntitySchema(userEntity, schema);

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
          signOptions: { expiresIn },
        }),
      ],
      providers: [
        AuthServiceProvider,
        LocalStrategyProvider,
        JwtStrategy,
        BcryptService,
      ],
      controllers: [AuthController],
    };
  }

  /**
   * Initializes the auth options with default values.
   * @param {DynamicApiAuthOptions} useAuth - The auth options.
   * @returns {DynamicApiAuthOptions} - The initialized auth options.
   */
  private static initializeAuthOptions<Entity extends BaseEntity>({
    userEntity,
    login,
    register,
    resetPassword,
    jwt,
    validationPipeOptions,
  }: DynamicApiAuthOptions<Entity>): DynamicApiAuthOptions<Entity> {
    return {
      userEntity: userEntity,
      login: {
        ...login,
        loginField: (login?.loginField ?? 'email') as keyof Entity,
        passwordField: (login?.passwordField ?? 'password') as keyof Entity,
        additionalFields: login?.additionalFields ?? [],
      },
      register: {
        ...register,
        additionalFields: register?.additionalFields ?? [],
        protected: register?.protected ?? !!register?.abilityPredicate,
      },
      resetPassword: {
        ...resetPassword,
        emailField: (!resetPassword?.emailField ? 'email' as keyof Entity : String(resetPassword.emailField)),
        expirationInMinutes: resetPassword?.expirationInMinutes ?? 10,
      },
      jwt: {
        secret: jwt?.secret ?? 'dynamic-api-jwt-secret',
        expiresIn: jwt?.expiresIn ?? '1d',
      },
      validationPipeOptions: validationPipeOptions,
    };
  }
}
