import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { ManyEntityQuery } from '../dtos';
import { DynamicApiModule } from '../dynamic-api.module';
import { ExtendedSocket } from '../interfaces';
import { BaseEntity } from '../models';

export abstract class BaseGateway<Entity extends BaseEntity> {
  private readonly logger = new Logger(BaseGateway.name);

  protected constructor(protected readonly jwtService: JwtService) {}

  protected addUserToSocket(socket: ExtendedSocket<Entity>, isPublic: boolean) {
    const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

    if (!isAuthEnabled || isPublic) {
      return;
    }

    const accessToken = socket.handshake.query.accessToken as string;
    let verified: Partial<Entity> & { iat: number; exp: number; };

    if (accessToken) {
      try {
        verified = this.jwtService.verify(accessToken, {
          secret: DynamicApiModule.state.get('jwtSecret'),
        });
      } catch (e) {
        this.logger.warn('Invalid access token');
        this.logger.error(e.message, e.stack);
      }

      // noinspection JSUnusedLocalSymbols
      const { iat, exp, ...user } = verified ?? {};

      socket.user = !isEmpty(user) ? user as unknown as Entity : undefined;
    }

    if (socket.user?.id && verified?.exp > Date.now() / 1000) {
      return;
    }

    throw new WsException('Unauthorized');
  }

  protected isValidManyBody<T extends object>(body: T) {
    return Boolean('ids' in body &&
      Array.isArray((
        body as ManyEntityQuery
      ).ids) &&
      (
        body as ManyEntityQuery
      ).ids.length);
  }
}
