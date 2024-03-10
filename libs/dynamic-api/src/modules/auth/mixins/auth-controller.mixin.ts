import { Body, Get, HttpCode, HttpStatus, Post, Request, Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthDecoratorsBuilder } from '../../../builders';
import { Public } from '../../../decorators';
import { RouteDecoratorsHelper } from '../../../helpers';
import { BaseEntity } from '../../../models';
import { JwtAuthGuard, LocalAuthGuard } from '../guards';
import { AuthController, AuthControllerConstructor, AuthService } from '../interfaces';

function AuthControllerMixin<Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  additionalRegisterFields: (keyof Entity)[] = [],
  additionalRequestFields: (keyof Entity)[] = [],
  protectRegister: boolean = false,
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
    register(@Body() body: AuthRegisterDto) {
      return this.service.register(body);
    }
  }

  return BaseAuthController;
}

export { AuthControllerMixin };
