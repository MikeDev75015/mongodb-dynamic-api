import { Type, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiDecoratorBuilder } from '../../interfaces';
import { JwtAuthGuard } from '../../modules';

/** @deprecated Internal API — will be removed from public exports in v5. */
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
