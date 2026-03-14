import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicApiModule } from '../../../../dynamic-api.module';
import { ExtendedSocket } from '../../../../interfaces';
import { MongoDBDynamicApiLogger } from '../../../../logger';

@Injectable()
export class JwtSocketRefreshGuard implements CanActivate {
  private readonly logger = new MongoDBDynamicApiLogger(JwtSocketRefreshGuard.name);

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const [socket] = context.getArgs();
    const refreshToken = this.getRefreshTokenFromSocket(socket);
    const user = await this.extractUserFromToken(refreshToken);

    if (isEmpty(user)) {
      this.logger.warn('No user data from refresh token');
      throw new WsException('Unauthorized');
    }

    socket.user = user;
    return true;
  }

  protected getRefreshTokenFromSocket(socket: ExtendedSocket): string {
    const refreshToken = socket.handshake.query.refreshToken as string;

    if (!refreshToken) {
      throw new WsException('Unauthorized');
    }

    return refreshToken;
  }

  protected async extractUserFromToken(refreshToken: string): Promise<unknown> {
    const refreshSecret = DynamicApiModule.state.get<string | undefined>('jwtRefreshSecret');
    const jwtSecret = DynamicApiModule.state.get<string>('jwtSecret');
    const secret = refreshSecret ?? jwtSecret;

    const jwtService = new JwtService({ secret });

    try {
      const { iat, exp, jti, ...user } = await jwtService.verifyAsync(refreshToken, {
        secret,
        ignoreExpiration: false,
      });

      return user;
    } catch (e: any) {
      this.logger.warn('extractUserFromToken (refresh) jwtService.verify error');
      this.logger.warn(e.message);

      throw new WsException('Unauthorized');
    }
  }
}

