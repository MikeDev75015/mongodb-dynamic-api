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
import { AuthAbilityPredicate, AfterSaveCallback, DynamicAPIServiceProvider, GatewayOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiBroadcastService } from '../../services';
import { OtpCode } from './models/otp-code.model';
import { AuthControllerConstructor, AuthGatewayConstructor, AuthService, DynamicApiGetAccountOptions, DynamicApiLoginOptions, DynamicApiRefreshTokenOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions, PasswordlessOptions } from './interfaces';
import { AuthControllerMixin, AuthGatewayMixin } from './mixins';
import { BaseAuthService } from './services';

const authServiceProviderName = 'DynamicApiAuthService';
const authGatewayProviderName = 'DynamicApiAuthGateway';
const localStrategyProviderName = 'DynamicApiLocalStrategy';

function createLocalStrategyProvider<Entity extends BaseEntity>(
  loginField: keyof Entity,
  passwordField: keyof Entity,
  abilityPredicate: AuthAbilityPredicate | undefined,
  customValidate?: (req: any) => Promise<Entity | null>,
  useStrategy?: Type<any>,
): DynamicAPIServiceProvider {
  if (useStrategy) {
    return {
      provide: localStrategyProviderName,
      useClass: useStrategy,
    };
  }

  @Injectable()
  class LocalStrategy extends PassportStrategy(Strategy) {
    protected abilityPredicate = abilityPredicate;
    protected customValidate = customValidate;

    constructor(
      @Inject(authServiceProviderName)
      protected readonly authService: AuthService<Entity>,
    ) {
      super({
        usernameField: loginField as string,
        passwordField: passwordField as string,
        passReqToCallback: true,
      });
    }

    /**
     * Override passport-local's authenticate to bypass its built-in
     * "Missing credentials" check when customValidate is defined.
     * passport-local rejects requests with falsy username/password
     * BEFORE calling the verify callback, which prevents customValidate
     * from ever being reached in passwordless flows.
     */
    authenticate(req: any, options?: any) {
      if (!req.body?.[loginField as string] && req.body?.login != null) {
        req.body[loginField as string] = req.body.login;
      }

      if (!this.customValidate) {
        return super.authenticate(req, options);
      }

      const login = req.body?.[loginField as string] ?? '';
      const pass = req.body?.[passwordField as string] ?? '';

      this.validate(req, login, pass)
        .then((user) => this.success(user))
        .catch((err) => this.error(err));
    }

    async validate(req: any, login: string, pass: string): Promise<any> {
      let user = this.customValidate ? await this.customValidate(req) : null;

      if (!user) {
        user = await this.authService.validateUser(login, pass);
      }

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

type AuthServiceProviderOptions<Entity extends BaseEntity> = {
  loginOptions: DynamicApiLoginOptions<Entity>;
  getAccountCallback?: AfterSaveCallback<Entity>;
  register?: DynamicApiRegisterOptions<Entity>;
  resetPasswordOptions?: DynamicApiResetPasswordOptions<Entity>;
  updateAccount?: DynamicApiUpdateAccountOptions<Entity>;
  refreshToken?: DynamicApiRefreshTokenOptions<Entity>;
  passwordlessOptions?: PasswordlessOptions<Entity>;
};

function createAuthServiceProvider<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  {
    loginOptions: { loginField, passwordField, additionalFields = [], callback: loginCallback },
    getAccountCallback,
    register,
    resetPasswordOptions,
    updateAccount,
    refreshToken,
    passwordlessOptions,
  }: AuthServiceProviderOptions<Entity>,
): DynamicAPIServiceProvider {
  class AuthService extends BaseAuthService<Entity> {
    protected entity = userEntity;
    protected additionalRequestFields = additionalFields;
    protected loginField = loginField;
    protected passwordField = passwordField;
    protected refreshTokenField = refreshToken?.refreshTokenField;
    protected refreshTokenOnUpdate = DynamicApiModule.state.get<boolean>('refreshTokenOnUpdate') ?? false;
    protected rotate = refreshToken?.rotate ?? true;
    protected reuseWindowMs = refreshToken?.reuseWindowMs ?? 0;

    protected beforeRegisterCallback = register?.beforeSaveCallback;
    protected registerCallback = register?.callback;

    protected beforeUpdateAccountCallback = updateAccount?.beforeSaveCallback;
    protected updateAccountCallback = updateAccount?.callback;
    protected loginCallback = loginCallback;
    protected getAccountCallback = getAccountCallback;
    protected resetPasswordOptions = resetPasswordOptions;
    protected passwordlessOptions = passwordlessOptions;

    constructor(
      @InjectModel(
        userEntity.name,
        DynamicApiModule.state.get('connectionName'),
      )
      protected readonly model: Model<Entity>,
      protected readonly jwtService: JwtService,
      protected readonly bcryptService: BcryptService,
      @Optional() @InjectModel(
        OtpCode.name,
        DynamicApiModule.state.get('connectionName'),
      )
      protected readonly otpModel?: Model<OtpCode>,
    ) {
      super(model, jwtService, bcryptService, otpModel);
    }
  }

  return {
    provide: authServiceProviderName,
    useClass: AuthService,
  };
}

type CreateAuthControllerOptions<Entity extends BaseEntity> = {
  getAccountOptions?: DynamicApiGetAccountOptions<Entity>;
  registerOptions?: DynamicApiRegisterOptions<Entity>;
  validationPipeOptions?: ValidationPipeOptions;
  resetPasswordOptions?: DynamicApiResetPasswordOptions<Entity>;
  updateAccountOptions?: DynamicApiUpdateAccountOptions<Entity>;
  refreshTokenOptions?: DynamicApiRefreshTokenOptions<Entity>;
  passwordlessOptions?: PasswordlessOptions<Entity>;
};

type CreateAuthGatewayOptions<Entity extends BaseEntity> = GatewayOptions & {
  validationPipeOptions?: ValidationPipeOptions;
  getAccountOptions?: DynamicApiGetAccountOptions<Entity>;
  registerOptions?: DynamicApiRegisterOptions<Entity>;
  resetPasswordOptions?: DynamicApiResetPasswordOptions<Entity>;
  updateAccountOptions?: DynamicApiUpdateAccountOptions<Entity>;
  refreshTokenOptions?: DynamicApiRefreshTokenOptions<Entity>;
};

function createAuthController<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginOptions: DynamicApiLoginOptions<Entity>,
  {
    getAccountOptions,
    registerOptions,
    validationPipeOptions,
    resetPasswordOptions,
    updateAccountOptions,
    refreshTokenOptions,
    passwordlessOptions,
  }: CreateAuthControllerOptions<Entity> = {},
): AuthControllerConstructor<Entity> {
  @Controller('auth')
  @ApiTags('Auth')
  @ValidatorPipe(validationPipeOptions)
  class AuthController extends AuthControllerMixin(
    userEntity,
    {
      loginOptions,
      registerOptions,
      resetPasswordOptions,
      updateAccountOptions,
      getAccountOptions,
      refreshTokenOptions,
      passwordlessOptions,
    },
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
  {
    getAccountOptions,
    registerOptions,
    resetPasswordOptions,
    updateAccountOptions,
    refreshTokenOptions,
    validationPipeOptions,
    ...gatewayOptions
  }: CreateAuthGatewayOptions<Entity>,
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
    refreshTokenOptions,
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
