import { Body, Get, HttpCode, HttpStatus, Optional, Patch, Post, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { AuthDecoratorsBuilder } from '../../../builders';
import { ApiEndpointVisibility, Public } from '../../../decorators';
import { RouteDecoratorsHelper } from '../../../helpers';
import { EntityBodyMixin } from '../../../mixins';
import { BaseEntity } from '../../../models';
import { DynamicApiBroadcastService } from '../../../services';
import { buildAuthBroadcastData } from '../auth-broadcast.helper';
import {
  AUTH_GET_ACCOUNT_BROADCAST_EVENT,
  AUTH_LOGIN_BROADCAST_EVENT,
  AUTH_REGISTER_BROADCAST_EVENT,
  AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT,
} from '../auth-events.constants';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { JwtAuthGuard, LocalAuthGuard, ResetPasswordGuard } from '../guards';
import { AuthController, AuthControllerConstructor, AuthService, DynamicApiGetAccountOptions, DynamicApiLoginOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions } from '../interfaces';
import { AuthPoliciesGuardMixin } from './auth-policies-guard.mixin';

function AuthControllerMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  {
    loginField,
    passwordField,
    additionalFields: additionalRequestFields = [],
    useInterceptors: loginUseInterceptors = [],
    broadcast: loginBroadcastConfig,
  }: DynamicApiLoginOptions<Entity>,
  {
    additionalFields: additionalRegisterFields,
    protected: registerProtected,
    abilityPredicate: registerAbilityPredicate,
    useInterceptors: registerUseInterceptors = [],
    broadcast: registerBroadcastConfig,
  }: DynamicApiRegisterOptions<Entity> = {},
  {
    resetPasswordUseInterceptors = [],
    changePasswordUseInterceptors = [],
    ...resetPasswordOptions
  }: DynamicApiResetPasswordOptions<Entity> = {},
  {
    useInterceptors: updateAccountUseInterceptors = [],
    broadcast: updateAccountBroadcastConfig,
    ...updateAccountOptions
  }: DynamicApiUpdateAccountOptions<Entity> = {},
  {
    useInterceptors: getAccountUseInterceptors = [],
    broadcast: getAccountBroadcastConfig,
  }: DynamicApiGetAccountOptions<Entity> = {}
): AuthControllerConstructor<Entity> {
  if (!loginField || !passwordField) {
    throw new Error('Login and password fields are required');
  }

  // @ts-ignore
  class AuthBodyPasswordFieldDto extends PickType(userEntity, [passwordField]){
    @ApiProperty()
      // @ts-ignore
    [passwordField]: string;
  }

  // @ts-ignore
  class AuthLoginDto extends IntersectionType(
    PickType(userEntity, [loginField]),
    AuthBodyPasswordFieldDto,
  ) {}

  const additionalMandatoryFields: (keyof Entity)[] = [];
  const additionalOptionalFields: (keyof Entity)[] = [];

  if (!additionalRegisterFields) {
    additionalRegisterFields = [];
  }

  additionalRegisterFields.forEach((field) => {
    if (typeof field === 'string') {
      additionalOptionalFields.push(field);
      return;
    }

    const { required, name } = field as { name: keyof Entity, required?: boolean };

    if (required) {
      additionalMandatoryFields.push(name);
    } else {
      additionalOptionalFields.push(name);
    }
  });

  // @ts-ignore
  class AuthRegisterDto extends IntersectionType(
    PickType(userEntity, [loginField, ...additionalMandatoryFields]),
    additionalOptionalFields?.length
      ? IntersectionType(
        AuthBodyPasswordFieldDto,
        PartialType(PickType(userEntity, additionalOptionalFields)),
      )
      : AuthBodyPasswordFieldDto,
  ) {}

  class AuthUpdateAccountDto extends EntityBodyMixin(
    userEntity,
    true,
    [
      loginField,
      passwordField,
      ...updateAccountOptions.additionalFieldsToExclude ?? [],
    ],
  ) {}

  class AuthPresenter {
    @ApiProperty()
    accessToken: string;
  }

  // @ts-ignore
  class AuthUserPresenter extends PickType(userEntity, ['id', loginField, ...additionalRequestFields]) {}

  class AuthRegisterPoliciesGuard extends AuthPoliciesGuardMixin(userEntity, registerAbilityPredicate) {}
  const authRegisterDecorators = new AuthDecoratorsBuilder(registerProtected, AuthRegisterPoliciesGuard);

  class AuthUpdateAccountPoliciesGuard extends AuthPoliciesGuardMixin(userEntity, updateAccountOptions.abilityPredicate) {}
  const authUpdateAccountDecorators = new AuthDecoratorsBuilder(
    true,
    AuthUpdateAccountPoliciesGuard
  );

  class BaseAuthController implements AuthController<Entity> {
    constructor(
      protected readonly service: AuthService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
      @Optional() protected readonly jwtService?: JwtService,
    ) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthUserPresenter })
    @UseInterceptors(...getAccountUseInterceptors)
    @Get('account')
    async getAccount(@Request() req: { user: Entity }) {
      const account = await this.service.getAccount(req.user);

      if (getAccountBroadcastConfig) {
        const broadcastData = buildAuthBroadcastData(account, getAccountBroadcastConfig.fields);
        this.broadcastService?.broadcastFromHttp(
          getAccountBroadcastConfig.eventName ?? AUTH_GET_ACCOUNT_BROADCAST_EVENT,
          [broadcastData],
          getAccountBroadcastConfig,
        );
      }

      return account;
    }

    @ApiEndpointVisibility(!!resetPasswordOptions, Public())
    @UseGuards(new ResetPasswordGuard(!!resetPasswordOptions.emailField))
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseInterceptors(...changePasswordUseInterceptors)
    @Patch('change-password')
    changePassword(@Body() { resetPasswordToken, newPassword }: ChangePasswordDto) {
      return this.service.changePassword(resetPasswordToken, newPassword);
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthPresenter })
    @UseInterceptors(...loginUseInterceptors)
    @Post('login')
    async login(@Request() req: { user: Entity }, @Body() _: AuthLoginDto) {
      const result = await this.service.login(req.user);

      if (loginBroadcastConfig) {
        const broadcastData = buildAuthBroadcastData(req.user, loginBroadcastConfig.fields);
        this.broadcastService?.broadcastFromHttp(
          loginBroadcastConfig.eventName ?? AUTH_LOGIN_BROADCAST_EVENT,
          [broadcastData],
          loginBroadcastConfig,
        );
      }

      return result;
    }

    @RouteDecoratorsHelper(authRegisterDecorators)
    @HttpCode(HttpStatus.CREATED)
    @ApiCreatedResponse({ type: AuthPresenter })
    @UseInterceptors(...registerUseInterceptors)
    @Post('register')
    async register(@Body() body: AuthRegisterDto) {
      const result = await this.service.register(body);

      if (registerBroadcastConfig && this.jwtService) {
        const { iat, exp, ...userPayload } = (this.jwtService.decode(result.accessToken) as any) ?? {};
        const broadcastData = buildAuthBroadcastData(userPayload as Partial<Entity>, registerBroadcastConfig.fields);
        this.broadcastService?.broadcastFromHttp(
          registerBroadcastConfig.eventName ?? AUTH_REGISTER_BROADCAST_EVENT,
          [broadcastData],
          registerBroadcastConfig,
        );
      }

      return result;
    }

    @ApiEndpointVisibility(!!resetPasswordOptions, Public())
    @UseGuards(new ResetPasswordGuard(!!resetPasswordOptions.emailField))
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseInterceptors(...resetPasswordUseInterceptors)
    @Post('reset-password')
    resetPassword(@Body() { email }: ResetPasswordDto) {
      return this.service.resetPassword(email);
    }

    @RouteDecoratorsHelper(authUpdateAccountDecorators)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthUserPresenter })
    @UseInterceptors(...updateAccountUseInterceptors)
    @Patch('account')
    async updateAccount(
      @Request() req: { user: Entity },
      @Body() body: AuthUpdateAccountDto,
    ) {
      const account = await this.service.updateAccount(req.user, body);

      if (updateAccountBroadcastConfig) {
        const broadcastData = buildAuthBroadcastData(account, updateAccountBroadcastConfig.fields);
        this.broadcastService?.broadcastFromHttp(
          updateAccountBroadcastConfig.eventName ?? AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT,
          [broadcastData],
          updateAccountBroadcastConfig,
        );
      }

      return account;
    }
  }

  return BaseAuthController;
}

export { AuthControllerMixin };
