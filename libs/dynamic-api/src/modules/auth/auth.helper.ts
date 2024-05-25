import {
  Controller, ForbiddenException,
  Inject,
  Injectable,
  Type,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Strategy } from 'passport-local';
import { DynamicApiModule } from '../../dynamic-api.module';
import { AuthAbilityPredicate, DynamicApiServiceCallback, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import {
  AuthControllerConstructor,
  AuthService, DynamicApiLoginOptions,
  DynamicApiRegisterOptions, DynamicApiResetPasswordOptions,
} from './interfaces';
import { AuthControllerMixin } from './mixins';
import { BaseAuthService } from './services';

const authServiceProviderName = 'DynamicApiAuthService';
const localStrategyProviderName = 'DynamicApiLocalStrategy';

function createLocalStrategyProvider<Entity extends BaseEntity>(
  loginField: keyof Entity,
  passwordField: keyof Entity,
  abilityPredicate: AuthAbilityPredicate | undefined,
): DynamicAPIServiceProvider {
  @Injectable()
  class LocalStrategy<Entity extends BaseEntity> extends PassportStrategy(Strategy) {
    protected abilityPredicate = abilityPredicate;

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

      if (this.abilityPredicate && !this.abilityPredicate(user)) {
        throw new ForbiddenException('Access denied');
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
  { loginField, passwordField, additionalFields = [], callback: loginCallback }: DynamicApiLoginOptions<Entity>,
  registerCallback: DynamicApiServiceCallback<Entity> | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
): DynamicAPIServiceProvider {
  class AuthService extends BaseAuthService<Entity> {
    protected entity = userEntity;
    protected additionalRequestFields = additionalFields;
    protected loginField = loginField;
    protected passwordField = passwordField;
    protected registerCallback = registerCallback;
    protected loginCallback = loginCallback;
    protected resetPasswordOptions = resetPasswordOptions;

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
  { loginField, passwordField, additionalFields }: DynamicApiLoginOptions<Entity>,
  registerOptions: DynamicApiRegisterOptions<Entity> | undefined,
  validationPipeOptions: ValidationPipeOptions | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
): AuthControllerConstructor<Entity> {
  @Controller('auth')
  @ApiTags('Auth')
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class AuthController extends AuthControllerMixin(
    userEntity,
    loginField,
    passwordField,
    additionalFields,
  registerOptions ?? {},
  resetPasswordOptions,
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
