import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DecoratorBuilder } from '../../interfaces';

class AuthDecoratorsBuilder implements DecoratorBuilder<any> {
  constructor(
    private readonly protectRegister: boolean | undefined,
  ) {}

  public build() {
    return !this.protectRegister ? [Public()] : [ApiBearerAuth()];
  }
}

export { AuthDecoratorsBuilder };
