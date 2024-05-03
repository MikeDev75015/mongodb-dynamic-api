import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { buildSchemaFromEntity } from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import { createAuthController, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { DynamicApiAuthOptions, DynamicApiResetPasswordOptions } from './interfaces';
import { JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
  static forRoot<Entity extends BaseEntity>(
    {
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
    }: DynamicApiAuthOptions<Entity>,
    extraImports: any[] = [],
  ) {
    const { resetPasswordCallback, changePasswordCallback, emailField, expirationInMinutes } = resetPassword;
    const resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined = resetPasswordCallback
      ? { resetPasswordCallback, changePasswordCallback, emailField, expirationInMinutes }
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
    const LocalStrategyProvider = createLocalStrategyProvider(loginField, passwordField);

    return {
      module: AuthModule,
      imports: [
        ...extraImports,
        MongooseModule.forFeature(
          [
            {
              name: userEntity.name,
              schema: buildSchemaFromEntity(userEntity),
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
}
