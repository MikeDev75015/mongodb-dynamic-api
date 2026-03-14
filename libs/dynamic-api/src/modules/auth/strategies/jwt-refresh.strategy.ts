import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DynamicApiModule } from '../../../dynamic-api.module';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const useCookie = DynamicApiModule.state.get<boolean | undefined>('jwtRefreshUseCookie');
    const refreshSecret = DynamicApiModule.state.get<string | undefined>('jwtRefreshSecret');
    const jwtSecret = DynamicApiModule.state.get<string>('jwtSecret');

    super({
      jwtFromRequest: useCookie
        ? (req: any) => req?.cookies?.['refreshToken'] ?? null
        : ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: refreshSecret ?? jwtSecret,
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    const { iat, exp, jti, ...user } = payload;
    return user;
  }
}

