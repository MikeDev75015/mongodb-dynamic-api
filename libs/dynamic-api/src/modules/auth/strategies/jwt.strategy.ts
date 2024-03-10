import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { Credentials } from '../../../interfaces';

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

  async validate(payload: any) {
    const { iat, exp, ...user } = payload;
    return user;
  }
}