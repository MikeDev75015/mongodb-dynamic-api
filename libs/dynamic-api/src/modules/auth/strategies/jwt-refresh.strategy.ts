import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { isTokenOfType, stripTokenClaims } from '../../../helpers/auth-token.helper';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  static extractFromCookies(req: { cookies?: Record<string, string> }): string | null {
    return req?.cookies?.['refreshToken'] ?? null;
  }

  constructor() {
    const useCookie = DynamicApiModule.state.get<boolean | undefined>('jwtRefreshUseCookie');
    const refreshSecret = DynamicApiModule.state.get<string | undefined>('jwtRefreshSecret');
    const jwtSecret = DynamicApiModule.state.get<string>('jwtSecret');

    super({
      jwtFromRequest: useCookie
        ? JwtRefreshStrategy.extractFromCookies
        : ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: refreshSecret ?? jwtSecret,
      passReqToCallback: false,
    });
  }

  async validate(payload: Record<string, unknown>) {
    if (!isTokenOfType(payload, 'refresh')) {
      throw new UnauthorizedException();
    }

    const { jti, ...user } = stripTokenClaims(payload);
    return user;
  }
}

