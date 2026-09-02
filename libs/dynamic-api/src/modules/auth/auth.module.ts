import * as cookieParser from 'cookie-parser';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { DynamicApiModule } from '../../dynamic-api.module';
import { createDynamicApiBroadcastGateway } from '../../gateways';
import { buildSchemaFromEntity, initializeConfigFromOptions } from '../../helpers';
import { GatewayOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BcryptService, DynamicApiGlobalStateService, DynamicApiBroadcastService } from '../../services';
import { authGatewayProviderName, createAuthController, createAuthGateway, createAuthServiceProvider, createLocalStrategyProvider } from './auth.helper';
import { OtpCode, OtpCodeSchema } from './models/otp-code.model';
import { DynamicApiAuthOptions, DynamicApiResetPasswordOptions } from './interfaces';
import { JwtRefreshStrategy, JwtStrategy } from './strategies';

// cookie-parser's CJS `module.exports` is itself the callable factory function. Under plain tsc
// (no esModuleInterop - confirmed in tsconfig.json), `import * as cookieParser` compiles to
// `const cookieParser = require(...)`, so `cookieParser` IS that callable directly. Under Vite's
// real-ESM SSR module runner (this repo's Vitest e2e config), the same `import *` instead yields a
// non-callable namespace object with the callable function on `.default` — true ESM semantics
// never make a namespace itself callable, that's a tsc/CJS-only accident this code relied on. This
// accessor is correct under both: `.default` is undefined on the raw CJS export tsc produces, so it
// falls back to the namespace itself; it's the actual function under Vite's ESM interop.
const cookieParserMiddleware = (cookieParser as unknown as { default?: typeof cookieParser }).default ?? cookieParser;

@Module({})
export class AuthModule implements NestModule {
  private static useCookie = false;

  configure(consumer: MiddlewareConsumer) {
    if (AuthModule.useCookie) {
      consumer.apply(cookieParserMiddleware()).forRoutes('*');
    }
  }

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
      refreshToken,
      passwordless,
      jwt: { secret, expiresIn },
      validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    } = this.initializeAuthOptions<Entity>(options);

    AuthModule.useCookie = refreshToken?.useCookie ?? false;

    const { resetPasswordCallback, ...resetPasswordOptionsRest } = resetPassword;
    const resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined = resetPasswordCallback
      ? { resetPasswordCallback, ...resetPasswordOptionsRest }
      : undefined;

    const connectionName = DynamicApiModule.state.get<string>('connectionName');

    const AuthController = createAuthController(
      userEntity,
      { loginField, passwordField, ...login },
      {
        getAccountOptions: getAccount,
        registerOptions: register,
        validationPipeOptions,
        resetPasswordOptions,
        updateAccountOptions: updateAccount,
        refreshTokenOptions: refreshToken,
        passwordlessOptions: passwordless,
      },
    );

    const AuthServiceProvider = createAuthServiceProvider(
      userEntity,
      {
        loginOptions: { loginField, passwordField, ...login },
        getAccountCallback: getAccount?.callback,
        register,
        resetPasswordOptions,
        updateAccount,
        refreshToken,
        passwordlessOptions: passwordless,
      },
    );
    const LocalStrategyProvider = createLocalStrategyProvider(
      loginField, passwordField, login.abilityPredicate, login.customValidate, login.useStrategy,
    );

    const schema = buildSchemaFromEntity(userEntity);
    DynamicApiGlobalStateService.addEntitySchema(userEntity, schema);

    const gatewayOptions = initializeConfigFromOptions(
      webSocket ?? DynamicApiModule.state.get('gatewayOptions'),
    );

    const hasBroadcast = !!(login?.broadcast || register?.broadcast || getAccount?.broadcast || updateAccount?.broadcast);

    const broadcastProviders = hasBroadcast ? [
      DynamicApiBroadcastService,
      createDynamicApiBroadcastGateway(
        DynamicApiModule.state.get<GatewayOptions>('broadcastGatewayOptions') ?? {},
      ),
    ] : [];

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
          {
            ...gatewayOptions,
            validationPipeOptions,
            getAccountOptions: getAccount,
            registerOptions: register,
            resetPasswordOptions,
            updateAccountOptions: updateAccount,
            refreshTokenOptions: refreshToken,
          },
        ),
      },
    ];

    const otpFeatureModule = passwordless
      ? MongooseModule.forFeature(
          [{ name: OtpCode.name, schema: OtpCodeSchema }],
          connectionName,
        )
      : undefined;

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
        ...(otpFeatureModule ? [otpFeatureModule] : []),
        // `@nestjs/core` v12 regressed `reflectOptionalParams()` from `Reflect.getMetadata` (v11,
        // climbs the prototype chain) to `Reflect.getOwnMetadata` (own class only) — verified by
        // diffing the two versions' injector.js. This breaks the standard `class Foo extends
        // AuthGuard('jwt') {}` pattern (JwtAuthGuard/JwtRefreshGuard/LocalAuthGuard below, all used
        // via `@UseGuards(SomeGuard)`, i.e. DI-instantiated): @nestjs/passport's `AuthGuard()` mixin
        // marks its own constructor param `@Optional()`, but that metadata lives on the mixin's
        // `MixinAuthGuard` base class, not on our guard subclasses (which declare no constructor of
        // their own), so the DI resolver no longer sees it as optional and throws "Nest can't resolve
        // dependencies ... AuthModuleOptions" instead of falling back to `{}`. Registering
        // `AuthModuleOptions` for real here (this is also exactly what the passport lib's own
        // "import PassportModule in each place where AuthGuard() is being used" warning recommends)
        // sidesteps the bug entirely — the token is found, so the optional-fallback path is never hit.
        PassportModule.register({}),
        JwtModule.register({
          global: true,
          secret,
          signOptions: { expiresIn: expiresIn as number | StringValue },
        }),
      ],
      providers: [
        AuthServiceProvider,
        LocalStrategyProvider,
        JwtStrategy,
        JwtRefreshStrategy,
        BcryptService,
        ...broadcastProviders,
        ...webSocketsProviders,
        ...extraProviders,
      ],
      controllers: [AuthController, ...extraControllers],
    };
  }

  private static initializeAuthOptions<Entity extends BaseEntity>({
    userEntity,
    jwt,
    login,
    register,
    updateAccount,
    getAccount,
    resetPassword,
    refreshToken,
    passwordless,
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
        expiresIn: jwt?.expiresIn ?? '15m',
        refreshTokenExpiresIn: jwt?.refreshTokenExpiresIn ?? '7d',
        refreshSecret: jwt?.refreshSecret,
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
      refreshToken: {
        ...refreshToken,
        useInterceptors: refreshToken?.useInterceptors ?? [],
        refreshTokenField: refreshToken?.refreshTokenField,
        useCookie: refreshToken?.useCookie ?? false,
      },
      passwordless: passwordless
        ? {
            ...passwordless,
            otpExpirationMinutes: passwordless.otpExpirationMinutes ?? 10,
          }
        : undefined,
      validationPipeOptions: validationPipeOptions,
      webSocket,
      extraImports,
      extraProviders,
      extraControllers,
    };
  }
}
