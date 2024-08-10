import { Type, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { BaseGateway } from '../../../gateways';
import { isNotEmptyObject } from '../../../helpers';
import { ExtendedSocket } from '../../../interfaces';
import { EntityBodyMixin } from '../../../mixins';
import { BaseEntity } from '../../../models';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { JwtSocketAuthGuard, ResetPasswordGuard } from '../guards';
import {
  AuthGatewayConstructor,
  AuthService,
  DynamicApiLoginOptions,
  DynamicApiRegisterOptions,
  DynamicApiResetPasswordOptions,
  DynamicApiUpdateAccountOptions,
} from '../interfaces';
import { AuthSocketPoliciesGuardMixin } from './auth-policies-guard.mixin';

function AuthGatewayMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  {
    loginField,
    passwordField,
    abilityPredicate: loginAbilityPredicate,
  }: DynamicApiLoginOptions<Entity>,
  {
    additionalFields: additionalSocketRegisterFields,
    protected: registerProtected,
    abilityPredicate: registerAbilityPredicate,
  }: DynamicApiRegisterOptions<Entity> = {},
  resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> = {},
  updateAccountOptions: DynamicApiUpdateAccountOptions<Entity> = {},
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

  const getAccountEvent = 'auth-get-account';
  const updateAccountEvent = 'auth-update-account';
  const loginEvent = 'auth-login';
  const registerEvent = 'auth-register';
  const resetPasswordEvent = 'auth-reset-password';
  const changePasswordEvent = 'auth-change-password';

  class BaseAuthGateway extends BaseGateway<Entity> {
    constructor(
      protected readonly service: AuthService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseGuards(new JwtSocketAuthGuard())
    @SubscribeMessage(getAccountEvent)
    async getAccount(@ConnectedSocket() socket: ExtendedSocket<Entity>) {
      return {
        event: getAccountEvent,
        data: socket.user ? await this.service.getAccount(socket.user) : undefined,
      };
    }

    @UseGuards(new JwtSocketAuthGuard(), new AuthUpdateAccountPoliciesGuard())
    @SubscribeMessage(updateAccountEvent)
    async updateAccount(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: AuthUpdateAccountDto,
    ) {
      return {
        event: updateAccountEvent,
        data: socket.user ? await this.service.updateAccount(socket.user, body) : undefined,
      };
    }

    @SubscribeMessage(loginEvent)
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

      return {
        event: loginEvent,
        data: await this.service.login(socket.user),
      };
    }

    @UseGuards(new AuthRegisterPoliciesGuard())
    @SubscribeMessage(registerEvent)
    async register(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() data: AuthSocketRegisterDto,
    ) {
      this.addUserToSocket(socket, !registerProtected && !registerAbilityPredicate);

      if (registerAbilityPredicate && !registerAbilityPredicate(socket.user)) {
        throw new WsException('Access denied');
      }

      return {
        event: registerEvent,
        data: await this.service.register(data),
      };
    }

    @UseGuards(new ResetPasswordGuard(isNotEmptyObject(resetPasswordOptions)))
    @SubscribeMessage(resetPasswordEvent)
    async resetPassword(@MessageBody() { email }: ResetPasswordDto) {
      if (isEmpty(resetPasswordOptions)) {
        throw new WsException('This feature is not enabled');
      }

      return {
        event: resetPasswordEvent,
        data: await this.service.resetPassword(email),
      };
    }

    @UseGuards(new ResetPasswordGuard(isNotEmptyObject(resetPasswordOptions)))
    @SubscribeMessage(changePasswordEvent)
    async changePassword(@MessageBody() { resetPasswordToken, newPassword }: ChangePasswordDto) {
      if (isEmpty(resetPasswordOptions)) {
        throw new WsException('This feature is not enabled');
      }

      return {
        event: changePasswordEvent,
        data: await this.service.changePassword(resetPasswordToken, newPassword),
      };
    }
  }

  return BaseAuthGateway;
}

export { AuthGatewayMixin };
