import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicApiModule } from '../../../../dynamic-api.module';
import { ExtendedSocket } from '../../../../interfaces';
import { MongoDBDynamicApiLogger } from '../../../../logger';

@Injectable()
export class JwtSocketAuthGuard implements CanActivate {
  private readonly logger = new MongoDBDynamicApiLogger(JwtSocketAuthGuard.name);

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const [socket] = context.getArgs();

    const accessToken = this.getAccessTokenFromSocketQuery(socket);

    const user = await this.extractUserFromToken(accessToken);

    if (isEmpty(user)) {
      this.logger.warn('No user data');
      throw new WsException('Unauthorized');
    }

    socket.user = user;
    return true;
  }

  protected getAccessTokenFromSocketQuery(socket: ExtendedSocket): string {
    const accessToken = socket.handshake.query.accessToken as string;

    if (!accessToken) {
      throw new WsException('Unauthorized');
    }

    return accessToken;
  }

  protected async extractUserFromToken(accessToken: string): Promise<unknown> {
    const jwtService = new JwtService({
      secret: DynamicApiModule.state.get('jwtSecret'),
      signOptions: {
        expiresIn: DynamicApiModule.state.get('jwtExpirationTime'),
      },
    });

    try {
      const { iat, exp, ...user } = await jwtService.verifyAsync(accessToken, {
        secret: DynamicApiModule.state.get('jwtSecret'),
        ignoreExpiration: false,
      });

      return user;
    } catch (e: any) {
      this.logger.warn('extractUserFromToken jwtService.verify error');
      this.logger.warn(e.message);

      throw new WsException('Unauthorized');
    }
  }
}
