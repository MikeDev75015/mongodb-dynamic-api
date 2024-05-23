import { Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiDecoratorBuilder } from '../../interfaces';
import { JwtAuthGuard } from '../../modules';

class AuthDecoratorsBuilder implements DynamicApiDecoratorBuilder<any> {
  constructor(
    private readonly protectRegister: boolean | undefined,
    private readonly AuthRegisterPoliciesGuard: Type,
  ) {}

  public build() {
    return !this.protectRegister
      ? [Public(), UseGuards(this.AuthRegisterPoliciesGuard)]
      : [ApiBearerAuth(), UseGuards(JwtAuthGuard, this.AuthRegisterPoliciesGuard)];
  }
}

export { AuthDecoratorsBuilder };
