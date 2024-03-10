import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { buildSchemaFromEntity } from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import { createAuthController, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { AuthOptions } from './interfaces';
import { JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
  static forRoot<Entity extends BaseEntity>(
    {
      user: {
        entity: userEntity,
        loginField,
        passwordField,
        additionalFields,
      },
      jwt,
      protectRegister,
    }: AuthOptions<Entity>,
    extraImports: any[] = [],
  ) {
    const state = DynamicApiModule.state.get();
    if (!loginField) {
      loginField = state.credentials.loginField as keyof Entity;
    }
    if (!passwordField) {
      passwordField = state.credentials.passwordField as keyof Entity;
    }

    const AuthController = createAuthController(
      userEntity,
      loginField,
      passwordField,
      additionalFields,
      protectRegister,
    );
    const AuthServiceProvider = createAuthServiceProvider(userEntity, loginField, passwordField, additionalFields);
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
          secret: jwt?.secret ?? state.jwtSecret,
          signOptions: { expiresIn: jwt?.expiresIn ?? '1d' },
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
