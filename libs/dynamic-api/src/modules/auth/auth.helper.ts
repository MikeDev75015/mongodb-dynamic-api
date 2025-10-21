import { Controller, ForbiddenException, Inject, Injectable, Type, UnauthorizedException, UseFilters, ValidationPipeOptions } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { WebSocketGateway } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Strategy } from 'passport-local';
import { ValidatorPipe } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { AuthAbilityPredicate, DynamicApiServiceBeforeSaveCallback, DynamicApiServiceCallback, DynamicAPIServiceProvider, GatewayOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService } from '../../services';
import { AuthControllerConstructor, AuthGatewayConstructor, AuthService, DynamicApiLoginOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions } from './interfaces';
import { AuthControllerMixin, AuthGatewayMixin } from './mixins';
import { BaseAuthService } from './services';

const authServiceProviderName = 'DynamicApiAuthService';
const authGatewayProviderName = 'DynamicApiAuthGateway';
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
  updateAccountCallback: DynamicApiServiceCallback<Entity> | undefined,
  beforeRegisterCallback: DynamicApiServiceBeforeSaveCallback<Entity> | undefined,
  beforeUpdateAccountCallback: DynamicApiServiceBeforeSaveCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class AuthService extends BaseAuthService<Entity> {
    protected entity = userEntity;
    protected additionalRequestFields = additionalFields;
    protected loginField = loginField;
    protected passwordField = passwordField;

    protected beforeRegisterCallback = beforeRegisterCallback;
    protected registerCallback = registerCallback;

    protected beforeUpdateAccountCallback = beforeUpdateAccountCallback;
    protected updateAccountCallback = updateAccountCallback;
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
  loginOptions: DynamicApiLoginOptions<Entity>,
  registerOptions: DynamicApiRegisterOptions<Entity> | undefined,
  validationPipeOptions: ValidationPipeOptions | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
  updateAccountOptions: DynamicApiUpdateAccountOptions<Entity> | undefined,
): AuthControllerConstructor<Entity> {
  @Controller('auth')
  @ApiTags('Auth')
  @ValidatorPipe(validationPipeOptions)
  class AuthController extends AuthControllerMixin(
    userEntity,
    loginOptions,
    registerOptions,
    resetPasswordOptions,
    updateAccountOptions,
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

function createAuthGateway<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginOptions: DynamicApiLoginOptions<Entity>,
  registerOptions: DynamicApiRegisterOptions<Entity> | undefined,
  validationPipeOptions: ValidationPipeOptions | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
  updateAccountOptions: DynamicApiUpdateAccountOptions<Entity> | undefined,
  gatewayOptions: GatewayOptions,
): AuthGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @UseFilters(new DynamicAPIWsExceptionFilter())
  @ValidatorPipe(validationPipeOptions)
  class AuthGateway extends AuthGatewayMixin(
    userEntity,
    loginOptions,
    registerOptions ?? {},
    resetPasswordOptions,
    updateAccountOptions,
  ) {
    constructor(
      @Inject(authServiceProviderName)
      protected readonly service: AuthService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  return AuthGateway;
}

export {
  authServiceProviderName,
  authGatewayProviderName,
  createAuthController,
  createAuthServiceProvider,
  createAuthGateway,
  createLocalStrategyProvider,
  localStrategyProviderName,
};
