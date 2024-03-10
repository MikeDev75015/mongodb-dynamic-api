import { Controller, Inject, Injectable, Type, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Strategy } from 'passport-local';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import { AuthAdditionalFields, AuthControllerConstructor, AuthService } from './interfaces';
import { AuthControllerMixin } from './mixins';
import { BaseAuthService } from './services';

const authServiceProviderName = 'DynamicApiAuthService';
const localStrategyProviderName = 'DynamicApiLocalStrategy';

function createLocalStrategyProvider<Entity extends BaseEntity>(
  loginField: keyof Entity,
  passwordField: keyof Entity,
): DynamicAPIServiceProvider {
  @Injectable()
  class LocalStrategy<Entity extends BaseEntity> extends PassportStrategy(Strategy) {
    constructor(
      @Inject(authServiceProviderName)
      protected readonly authService: AuthService<Entity>,
    ) {
      super({
        usernameField: loginField as string,
        passwordField: passwordField as string,
      });
    }

    async validate(login: string, pass: string): Promise<any> {
      const user = await this.authService.validateUser(login, pass);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return user;
    }
  }

  return {
    provide: localStrategyProviderName,
    useClass: LocalStrategy,
  };
}

function createAuthServiceProvider<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  additionalFields: AuthAdditionalFields<Entity> | undefined,
): DynamicAPIServiceProvider {
  class AuthService extends BaseAuthService<Entity> {
    protected additionalRequestFields = additionalFields?.toRequest ?? [];

    protected loginField = loginField;

    protected passwordField = passwordField;

    constructor(
      @InjectModel(
        userEntity.name,
        DynamicApiModule.state.get('connectionName'),
      )
      protected readonly model: Model<Entity>,
      protected readonly jwtService: JwtService,
      protected readonly bcryptService: BcryptService,
    ) {
      super(model, jwtService, bcryptService);
    }
  }

  return {
    provide: authServiceProviderName,
    useClass: AuthService,
  };
}

function createAuthController<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  additionalFields: AuthAdditionalFields<Entity> | undefined,
  protectRegister: boolean | undefined,
): AuthControllerConstructor<Entity> {
  @Controller('auth')
  @ApiTags('Auth')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  class AuthController extends AuthControllerMixin(
    userEntity,
    loginField,
    passwordField,
    additionalFields?.toRegister,
    additionalFields?.toRequest,
    protectRegister,
  ) {
    constructor(
      @Inject(authServiceProviderName)
      protected readonly service: AuthService<Entity>,
    ) {
      super(service);
    }
  }

  return AuthController;
}

export {
  authServiceProviderName,
  createAuthController,
  createAuthServiceProvider,
  createLocalStrategyProvider,
  localStrategyProviderName,
};
