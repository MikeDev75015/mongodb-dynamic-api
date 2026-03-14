import { Controller, ForbiddenException, Inject, Injectable, Optional, Type, UnauthorizedException, UseFilters, ValidationPipeOptions } from '@nestjs/common';
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
import { AuthAbilityPredicate, DynamicApiServiceCallback, DynamicAPIServiceProvider, GatewayOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiBroadcastService } from '../../services';
import { AuthControllerConstructor, AuthGatewayConstructor, AuthService, DynamicApiGetAccountOptions, DynamicApiLoginOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions } from './interfaces';
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
  getAccountCallback: DynamicApiServiceCallback<Entity> | undefined,
  register: DynamicApiRegisterOptions<Entity> | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
  updateAccount: DynamicApiUpdateAccountOptions<Entity> | undefined,
): DynamicAPIServiceProvider {
  class AuthService extends BaseAuthService<Entity> {
    protected entity = userEntity;
    protected additionalRequestFields = additionalFields;
    protected loginField = loginField;
    protected passwordField = passwordField;

    protected beforeRegisterCallback = register?.beforeSaveCallback;
    protected registerCallback = register?.callback;

    protected beforeUpdateAccountCallback = updateAccount?.beforeSaveCallback;
    protected updateAccountCallback = updateAccount?.callback;
    protected loginCallback = loginCallback;
    protected getAccountCallback = getAccountCallback;
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
  getAccountOptions: DynamicApiGetAccountOptions<Entity> | undefined,
  registerOptions: DynamicApiRegisterOptions<Entity> | undefined,
  validationPipeOptions: ValidationPipeOptions | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
  updateAccountOptions: DynamicApiUpdateAccountOptions<Entity> | undefined
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
    getAccountOptions,
  ) {
    constructor(
      @Inject(authServiceProviderName)
      protected readonly service: AuthService<Entity>,
      @Optional() @Inject(DynamicApiBroadcastService)
      protected readonly broadcastService: DynamicApiBroadcastService,
      @Inject(JwtService)
      protected readonly jwtService: JwtService,
    ) {
      super(service, broadcastService, jwtService);
    }
  }

  return AuthController;
}

function createAuthGateway<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginOptions: DynamicApiLoginOptions<Entity>,
  getAccountOptions: DynamicApiGetAccountOptions<Entity> | undefined,
  registerOptions: DynamicApiRegisterOptions<Entity> | undefined,
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined,
  updateAccountOptions: DynamicApiUpdateAccountOptions<Entity> | undefined,
  { validationPipeOptions, ...gatewayOptions }: GatewayOptions & { validationPipeOptions?: ValidationPipeOptions },
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
    getAccountOptions,
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
