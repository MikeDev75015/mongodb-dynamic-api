import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiDecoratorBuilder } from '../../interfaces';

class AuthDecoratorsBuilder implements DynamicApiDecoratorBuilder<any> {
  constructor(
    private readonly protectRegister: boolean | undefined,
  ) {}

  public build() {
    return !this.protectRegister ? [Public()] : [ApiBearerAuth()];
  }
}

export { AuthDecoratorsBuilder };
