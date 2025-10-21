import { Body, Get, HttpCode, HttpStatus, Patch, Post, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { AuthDecoratorsBuilder } from '../../../builders';
import { ApiEndpointVisibility, Public } from '../../../decorators';
import { RouteDecoratorsHelper } from '../../../helpers';
import { EntityBodyMixin } from '../../../mixins';
import { BaseEntity } from '../../../models';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { JwtAuthGuard, LocalAuthGuard, ResetPasswordGuard } from '../guards';
import { AuthController, AuthControllerConstructor, AuthService, DynamicApiLoginOptions, DynamicApiRegisterOptions, DynamicApiResetPasswordOptions, DynamicApiUpdateAccountOptions } from '../interfaces';
import { AuthPoliciesGuardMixin } from './auth-policies-guard.mixin';

function AuthControllerMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  {
    loginField,
    passwordField,
    additionalFields: additionalRequestFields = [],
    useInterceptors: loginUseInterceptors = [],
  }: DynamicApiLoginOptions<Entity>,
  {
    additionalFields: additionalRegisterFields,
    protected: registerProtected,
    abilityPredicate: registerAbilityPredicate,
    useInterceptors: registerUseInterceptors = [],
  }: DynamicApiRegisterOptions<Entity> = {},
  {
    resetPasswordUseInterceptors = [],
    changePasswordUseInterceptors = [],
    ...resetPasswordOptions
  }: DynamicApiResetPasswordOptions<Entity> = {},
  {
    useInterceptors: updateAccountUseInterceptors = [],
    ...updateAccountOptions
  }: DynamicApiUpdateAccountOptions<Entity> = {},
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
    constructor(protected readonly service: AuthService<Entity>) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthUserPresenter })
    @Get('account')
    getAccount(@Request() req: { user: Entity }) {
      return this.service.getAccount(req.user);
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
    login(@Request() req: { user: Entity }, @Body() _: AuthLoginDto) {
      return this.service.login(req.user);
    }

    @RouteDecoratorsHelper(authRegisterDecorators)
    @HttpCode(HttpStatus.CREATED)
    @ApiCreatedResponse({ type: AuthPresenter })
    @UseInterceptors(...registerUseInterceptors)
    @Post('register')
    register(@Body() body: AuthRegisterDto) {
      return this.service.register(body);
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
    updateAccount(
      @Request() req: { user: Entity },
      @Body() body: AuthUpdateAccountDto,
    ) {
      return this.service.updateAccount(req.user, body);
    }
  }

  return BaseAuthController;
}

export { AuthControllerMixin };
