import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { Socket } from 'socket.io';
import { DynamicApiModule } from '../dynamic-api.module';
import { MongoDBDynamicApiLogger } from '../logger';

export class JwtSocketGuard implements CanActivate {
  private readonly logger = new MongoDBDynamicApiLogger(JwtSocketGuard.name);

  constructor(protected readonly isPublic = false) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const [socket] = context.getArgs();
    this.logger.debug('canActivate', {
      isPublic: this.isPublic,
      socketId: socket?.id,
    });

    if (!this.isPublic) {
      this.logger.debug('Checking user from socket query');
      const user = await this.getUserFromSocket(socket);

      if (isEmpty(user)) {
        this.logger.warn('No user data');
        throw new WsException('Unauthorized');
      }

      socket.user = user;
    }

    return true;
  }

  protected async getUserFromSocket(socket: Socket): Promise<unknown> {
    const accessToken = this.getAccessTokenFromSocketQuery(socket);
    return this.extractUserFromToken(accessToken);
  }

  private getAccessTokenFromSocketQuery(socket: Socket): string {
    const accessToken = socket.handshake.query.accessToken as string;
    this.logger.debug('getAccessTokenFromSocketQuery', {
      accessToken: !!accessToken,
    });

    if (!accessToken) {
      this.logger.warn('No access token provided in socket query');
      throw new WsException('Unauthorized');
    }

    return accessToken;
  }

  private async extractUserFromToken(accessToken: string): Promise<unknown> {
    this.logger.debug('extractUserFromToken', { accessToken: !!accessToken });

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
      this.logger.debug('User extracted from token', { userEmail: user?.email });

      return user;
    } catch (e: any) {
      this.logger.warn('extractUserFromToken jwtService.verify error');
      this.logger.warn(e.message);

      throw new WsException('Unauthorized');
    }
  }
}
