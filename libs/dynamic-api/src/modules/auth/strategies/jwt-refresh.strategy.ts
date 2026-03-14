import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DynamicApiModule } from '../../../dynamic-api.module';

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
    const { iat, exp, jti, ...user } = payload;
    return user;
  }
}

