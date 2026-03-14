import { Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { BaseGateway } from '../../../gateways';
import { isNotEmptyObject } from '../../../helpers';
import { ExtendedSocket } from '../../../interfaces';
import { EntityBodyMixin } from '../../../mixins';
import { BaseEntity } from '../../../models';
import { buildAuthBroadcastData } from '../auth-broadcast.helper';
import {
  AUTH_CHANGE_PASSWORD_EVENT,
  AUTH_GET_ACCOUNT_BROADCAST_EVENT,
  AUTH_GET_ACCOUNT_EVENT,
  AUTH_LOGIN_BROADCAST_EVENT,
  AUTH_LOGIN_EVENT,
  AUTH_LOGOUT_EVENT,
  AUTH_REFRESH_TOKEN_EVENT,
  AUTH_REGISTER_BROADCAST_EVENT,
  AUTH_REGISTER_EVENT,
  AUTH_RESET_PASSWORD_EVENT,
  AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT,
  AUTH_UPDATE_ACCOUNT_EVENT,
} from '../auth-events.constants';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { JwtSocketAuthGuard, JwtSocketRefreshGuard, ResetPasswordGuard } from '../guards';
import { AuthGatewayConstructor, AuthService, DynamicApiGetAccountOptions, DynamicApiLoginOptions, DynamicApiRefreshTokenOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions } from '../interfaces';
import { AuthSocketPoliciesGuardMixin } from './auth-policies-guard.mixin';

function AuthGatewayMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  {
    loginField,
    passwordField,
    abilityPredicate: loginAbilityPredicate,
    useInterceptors: loginUseInterceptors = [],
    broadcast: loginBroadcastConfig,
  }: DynamicApiLoginOptions<Entity>,
  {
    additionalFields: additionalSocketRegisterFields,
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
  }: DynamicApiGetAccountOptions<Entity> = {},
  {
    useInterceptors: refreshTokenUseInterceptors = [],
  }: DynamicApiRefreshTokenOptions<Entity> = {}
): AuthGatewayConstructor<Entity> {
  // @ts-ignore
  class AuthSocketBodyPasswordFieldDto extends PickType(userEntity, [passwordField]) {
    @ApiProperty()
      // @ts-ignore
    [passwordField]: string;
  }

  // @ts-ignore
  class AuthSocketLoginDto extends IntersectionType(
    PickType(userEntity, [loginField]),
    AuthSocketBodyPasswordFieldDto,
  ) {}

  const additionalSocketMandatoryFields: (keyof Entity)[] = [];
  const additionalSocketOptionalFields: (keyof Entity)[] = [];

  if (!additionalSocketRegisterFields) {
    additionalSocketRegisterFields = [];
  }

  additionalSocketRegisterFields.forEach((field) => {
    if (typeof field === 'string') {
      additionalSocketOptionalFields.push(field);
      return;
    }

    const { required, name } = field as { name: keyof Entity, required?: boolean };

    if (required) {
      additionalSocketMandatoryFields.push(name);
    } else {
      additionalSocketOptionalFields.push(name);
    }
  });

  // @ts-ignore
  class AuthSocketRegisterDto extends IntersectionType(
    PickType(userEntity, [loginField, ...additionalSocketMandatoryFields]),
    additionalSocketOptionalFields?.length
      ? IntersectionType(
        AuthSocketBodyPasswordFieldDto,
        PartialType(PickType(userEntity, additionalSocketOptionalFields)),
      )
      : AuthSocketBodyPasswordFieldDto,
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

  class AuthRegisterPoliciesGuard extends AuthSocketPoliciesGuardMixin(userEntity, registerAbilityPredicate) {}

  class AuthUpdateAccountPoliciesGuard extends AuthSocketPoliciesGuardMixin(
    userEntity,
    updateAccountOptions.abilityPredicate,
  ) {}

  class BaseAuthGateway extends BaseGateway<Entity> {
    constructor(
      protected readonly service: AuthService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseGuards(new JwtSocketAuthGuard())
    @UseInterceptors(...getAccountUseInterceptors)
    @SubscribeMessage(AUTH_GET_ACCOUNT_EVENT)
    async getAccount(@ConnectedSocket() socket: ExtendedSocket<Entity>) {
      const account = socket.user ? await this.service.getAccount(socket.user) : undefined;

      if (getAccountBroadcastConfig && account) {
        const broadcastData = buildAuthBroadcastData(account, getAccountBroadcastConfig.fields);
        this.broadcastIfNeeded(
          socket,
          getAccountBroadcastConfig.eventName ?? AUTH_GET_ACCOUNT_BROADCAST_EVENT,
          [broadcastData],
          getAccountBroadcastConfig,
        );
      }

      return { event: AUTH_GET_ACCOUNT_EVENT, data: account };
    }

    @UseGuards(new JwtSocketAuthGuard(), new AuthUpdateAccountPoliciesGuard())
    @UseInterceptors(...updateAccountUseInterceptors)
    @SubscribeMessage(AUTH_UPDATE_ACCOUNT_EVENT)
    async updateAccount(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: AuthUpdateAccountDto,
    ) {
      const account = socket.user ? await this.service.updateAccount(socket.user, body) : undefined;

      if (updateAccountBroadcastConfig && account) {
        const broadcastData = buildAuthBroadcastData(account, updateAccountBroadcastConfig.fields);
        this.broadcastIfNeeded(
          socket,
          updateAccountBroadcastConfig.eventName ?? AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT,
          [broadcastData],
          updateAccountBroadcastConfig,
        );
      }

      return { event: AUTH_UPDATE_ACCOUNT_EVENT, data: account };
    }

    @UseInterceptors(...loginUseInterceptors)
    @SubscribeMessage(AUTH_LOGIN_EVENT)
    async login(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() { [loginField]: login, [passwordField]: password }: AuthSocketLoginDto,
    ) {
      if (login && password) {
        socket.user = await this.service.validateUser(login as string, password as string);
      }

      if (!socket.user) {
        throw new WsException('Unauthorized');
      }

      if (loginAbilityPredicate && !loginAbilityPredicate(socket.user)) {
        throw new WsException('Access denied');
      }

      const result = await this.service.login(socket.user);

      if (loginBroadcastConfig) {
        const broadcastData = buildAuthBroadcastData(socket.user, loginBroadcastConfig.fields);
        this.broadcastIfNeeded(
          socket,
          loginBroadcastConfig.eventName ?? AUTH_LOGIN_BROADCAST_EVENT,
          [broadcastData],
          loginBroadcastConfig,
        );
      }

      return { event: AUTH_LOGIN_EVENT, data: result };
    }

    @UseGuards(new AuthRegisterPoliciesGuard())
    @UseInterceptors(...registerUseInterceptors)
    @SubscribeMessage(AUTH_REGISTER_EVENT)
    async register(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() data: AuthSocketRegisterDto,
    ) {
      this.addUserToSocket(socket, !registerProtected && !registerAbilityPredicate);

      const result = await this.service.register(data);

      if (registerBroadcastConfig) {
        const { iat, exp, ...userPayload } = (this.jwtService.decode(result.accessToken) as Record<string, unknown>) ?? {};
        const broadcastData = buildAuthBroadcastData(userPayload as Partial<Entity>, registerBroadcastConfig.fields);
        this.broadcastIfNeeded(
          socket,
          registerBroadcastConfig.eventName ?? AUTH_REGISTER_BROADCAST_EVENT,
          [broadcastData],
          registerBroadcastConfig,
        );
      }

      return { event: AUTH_REGISTER_EVENT, data: result };
    }

    @UseGuards(new ResetPasswordGuard(isNotEmptyObject(resetPasswordOptions)))
    @UseInterceptors(...resetPasswordUseInterceptors)
    @SubscribeMessage(AUTH_RESET_PASSWORD_EVENT)
    async resetPassword(@MessageBody() { email }: ResetPasswordDto) {
      if (isEmpty(resetPasswordOptions)) {
        throw new WsException('This feature is not enabled');
      }

      return {
        event: AUTH_RESET_PASSWORD_EVENT,
        data: await this.service.resetPassword(email),
      };
    }

    @UseGuards(new ResetPasswordGuard(isNotEmptyObject(resetPasswordOptions)))
    @UseInterceptors(...changePasswordUseInterceptors)
    @SubscribeMessage(AUTH_CHANGE_PASSWORD_EVENT)
    async changePassword(@MessageBody() { resetPasswordToken, newPassword }: ChangePasswordDto) {
      if (isEmpty(resetPasswordOptions)) {
        throw new WsException('This feature is not enabled');
      }

      return {
        event: AUTH_CHANGE_PASSWORD_EVENT,
        data: await this.service.changePassword(resetPasswordToken, newPassword),
      };
    }

    @UseGuards(new JwtSocketRefreshGuard())
    @UseInterceptors(...refreshTokenUseInterceptors)
    @SubscribeMessage(AUTH_REFRESH_TOKEN_EVENT)
    async refreshToken(@ConnectedSocket() socket: ExtendedSocket<Entity>) {
      const rawToken = socket.handshake.query.refreshToken as string;
      const result = socket.user ? await this.service.refreshToken(socket.user, rawToken) : undefined;

      return { event: AUTH_REFRESH_TOKEN_EVENT, data: result };
    }

    @UseGuards(new JwtSocketRefreshGuard())
    @SubscribeMessage(AUTH_LOGOUT_EVENT)
    async logout(@ConnectedSocket() socket: ExtendedSocket<Entity>) {
      if (socket.user) {
        await this.service.logout(socket.user);
      }

      return { event: AUTH_LOGOUT_EVENT, data: undefined };
    }
  }

  return BaseAuthGateway;
}

export { AuthGatewayMixin };
