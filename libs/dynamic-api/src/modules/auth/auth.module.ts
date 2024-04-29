import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { buildSchemaFromEntity } from '../../helpers';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import { createAuthController, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { DynamicApiAuthOptions } from './interfaces';
import { JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
  static forRoot<Entity extends BaseEntity>(
    {
      user: {
        entity: userEntity,
        loginField,
        passwordField,
        requestAdditionalFields,
      },
      jwt: { secret, expiresIn },
      register,
      validationPipeOptions,
    }: DynamicApiAuthOptions<Entity>,
    extraImports: any[] = [],
  ) {
    const AuthController = createAuthController(
      userEntity,
      loginField,
      passwordField,
      requestAdditionalFields,
      register,
      validationPipeOptions,
    );
    const AuthServiceProvider = createAuthServiceProvider(
      userEntity,
      loginField,
      passwordField,
      requestAdditionalFields,
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
