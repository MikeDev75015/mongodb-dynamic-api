import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicApiModule } from '../../../../dynamic-api.module';

@Injectable()
export class JwtSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtSocketAuthGuard.name);

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const [socket] = context.getArgs();

    const accessToken = socket.handshake.query.accessToken as string;

    if (!accessToken) {
      throw new WsException('Unauthorized');
    }

    const jwtService = new JwtService({
      secret: DynamicApiModule.state.get('jwtSecret'),
      signOptions: {
        expiresIn: DynamicApiModule.state.get('jwtExpirationTime'),
      },
    });

    let verified: { iat: number; exp: number };

    try {
      verified = await jwtService.verifyAsync(accessToken, {
        secret: DynamicApiModule.state.get('jwtSecret'),
        ignoreExpiration: false,
      });
    } catch (e: any) {
      this.logger.warn('jwtService.verify error');
      this.logger.warn(e.message);

      throw new UnauthorizedException('Unauthorized');
    }

    // noinspection JSUnusedLocalSymbols
    const { iat, exp, ...user } = verified;

    if (isEmpty(user)) {
      this.logger.warn('No user data');
      throw new WsException('Unauthorized');
    }

    socket.user = user;
    return true;
  }
}
