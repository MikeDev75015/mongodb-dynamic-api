import { Body, Get, HttpCode, HttpStatus, Patch, Post, Request, Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthDecoratorsBuilder } from '../../../builders';
import { ApiEndpointVisibility, Public } from '../../../decorators';
import { RouteDecoratorsHelper } from '../../../helpers';
import { BaseEntity } from '../../../models';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { JwtAuthGuard, LocalAuthGuard } from '../guards';
import {
  AuthController,
  AuthControllerConstructor,
  AuthService,
  DynamicApiRegisterOptions,
  DynamicApiResetPasswordOptions,
} from '../interfaces';
import { AuthRegisterPoliciesGuardMixin } from './auth-register-policies-guard.mixin';

function AuthControllerMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  additionalRequestFields: (keyof Entity)[] = [],
  {
    additionalFields: additionalRegisterFields,
    protected: registerProtected,
    abilityPredicate: registerAbilityPredicate,
  }: DynamicApiRegisterOptions<Entity> = {},
  resetPasswordOptions?: DynamicApiResetPasswordOptions<Entity>,
): AuthControllerConstructor<Entity> {
  if (!loginField || !passwordField) {
    throw new Error('Login and password fields are required');
  }

  class AuthBodyPasswordFieldDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
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

  class AuthPresenter {
    @ApiProperty()
    accessToken: string;
  }

  // @ts-ignore
  class AuthUserPresenter extends PickType(userEntity, ['id', loginField, ...additionalRequestFields]) {}

  const authDecorators = new AuthDecoratorsBuilder(registerProtected);

  class AuthRegisterPoliciesGuard extends AuthRegisterPoliciesGuardMixin(userEntity, registerAbilityPredicate) {}

  class BaseAuthController implements AuthController<Entity> {
    constructor(protected readonly service: AuthService<Entity>) {
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthUserPresenter })
    @Get('account')
    getAccount(@Request() req: { user: Entity }) {
      return this.service.getAccount(req.user);
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthPresenter })
    @Post('login')
    login(@Request() req: { user: Entity }, @Body() _: AuthLoginDto) {
      return this.service.login(req.user);
    }

    @RouteDecoratorsHelper(authDecorators)
    @HttpCode(HttpStatus.CREATED)
    @ApiOkResponse({ type: AuthPresenter })
    @Post('register')
    @UseGuards(AuthRegisterPoliciesGuard)
    register(@Body() body: AuthRegisterDto) {
      return this.service.register(body);
    }

    @ApiEndpointVisibility(!!resetPasswordOptions, Public())
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('reset-password')
    resetPassword(@Body() { email }: ResetPasswordDto) {
      return this.service.resetPassword(email);
    }

    @ApiEndpointVisibility(!!resetPasswordOptions, Public())
    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch('change-password')
    changePassword(@Body() { resetPasswordToken, newPassword }: ChangePasswordDto) {
      return this.service.changePassword(resetPasswordToken, newPassword);
    }
  }

  return BaseAuthController;
}

export { AuthControllerMixin };
