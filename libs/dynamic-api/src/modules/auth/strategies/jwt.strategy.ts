import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { isTokenOfType, stripTokenClaims } from '../../../helpers/auth-token.helper';
import { Credentials } from '../../../interfaces/dynamic-api-global-state.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  protected loginField = (
    DynamicApiModule.state.get<Credentials>('credentials')
  ).loginField;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: DynamicApiModule.state.get('jwtSecret'),
    });
  }

  validate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!isTokenOfType(payload, 'access')) {
      return Promise.reject(new UnauthorizedException());
    }

    return Promise.resolve(stripTokenClaims(payload));
  }
}