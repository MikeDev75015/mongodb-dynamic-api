import { Body, Get, HttpCode, HttpStatus, Post, Request, Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthDecoratorsBuilder } from '../../../builders';
import { CheckPolicies, Public } from '../../../decorators';
import { RouteDecoratorsHelper } from '../../../helpers';
import { AppAbility, DynamicApiAuthRegisterCaslAbilityPredicate } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { JwtAuthGuard, LocalAuthGuard } from '../guards';
import { AuthController, AuthControllerConstructor, AuthService } from '../interfaces';
import { AuthRegisterPoliciesGuardMixin, registerRouteType } from './auth-register-policies-guard.mixin';

function AuthControllerMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  additionalRegisterFields: (keyof Entity)[] = [],
  additionalRequestFields: (keyof Entity)[] = [],
  protectRegister: boolean = false,
  abilityPredicate?: DynamicApiAuthRegisterCaslAbilityPredicate,
): AuthControllerConstructor<Entity> {
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

  // @ts-ignore
  class AuthRegisterDto extends IntersectionType(
    PickType(userEntity, [loginField, ...additionalRegisterFields]),
    AuthBodyPasswordFieldDto,
  ) {}

  class AuthPresenter {
    @ApiProperty()
    accessToken: string;
  }

  // @ts-ignore
  class AuthUserPresenter extends PickType(userEntity, ['id', loginField, ...additionalRequestFields]) {}

  const authDecorators = new AuthDecoratorsBuilder(protectRegister);

  class AuthRegisterPoliciesGuard extends AuthRegisterPoliciesGuardMixin(userEntity, abilityPredicate) {}

  class BaseAuthController implements AuthController<Entity> {
    constructor(protected readonly service: AuthService<Entity>) {
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthUserPresenter })
    @Get('account')
    getAccount(@Request() req) {
      return this.service.getAccount(req.user);
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AuthPresenter })
    @Post('login')
    login(@Request() req, @Body() body: AuthLoginDto) {
      return this.service.login(req.user);
    }

    @RouteDecoratorsHelper(authDecorators)
    @HttpCode(HttpStatus.CREATED)
    @ApiOkResponse({ type: AuthPresenter })
    @Post('register')
    @UseGuards(AuthRegisterPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(registerRouteType, userEntity))
    register(@Body() body: AuthRegisterDto) {
      return this.service.register(body);
    }
  }

  return BaseAuthController;
}

export { AuthControllerMixin };
