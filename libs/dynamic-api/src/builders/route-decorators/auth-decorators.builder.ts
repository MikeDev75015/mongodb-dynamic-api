import { Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiDecoratorBuilder } from '../../interfaces/dynamic-api-decorator-builder.interface';
import { JwtAuthGuard } from '../../modules';

/** @internal Not part of the public API. */
class AuthDecoratorsBuilder implements DynamicApiDecoratorBuilder<any> {
  constructor(
    private readonly isProtected: boolean | undefined,
    private readonly AuthPoliciesGuard: Type | undefined,
  ) {}

  public build() {
    return !this.isProtected
      ? [Public()]
      : [
        ApiBearerAuth(),
        UseGuards(
          JwtAuthGuard,
          ...(
            this.AuthPoliciesGuard ? [this.AuthPoliciesGuard] : []
          ),
        ),
      ];
  }
}

export { AuthDecoratorsBuilder };
