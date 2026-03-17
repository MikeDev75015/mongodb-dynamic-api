import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { ManyEntityQuery } from '../dtos';
import { DynamicApiModule } from '../dynamic-api.module';
import { resolveRooms } from '../helpers';
import { DynamicApiBroadcastConfig, ExtendedSocket } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger';
import { BaseEntity } from '../models';

export abstract class BaseGateway<Entity extends BaseEntity> {
  private readonly logger = new MongoDBDynamicApiLogger(BaseGateway.name);

  protected constructor(protected readonly jwtService: JwtService) {}

  protected addUserToSocket(socket: ExtendedSocket<Entity>, isPublic: boolean) {
    const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

    if (!isAuthEnabled || isPublic) {
      return;
    }

    const accessToken = (socket.handshake.auth?.token
      ?? socket.handshake.query?.accessToken) as string;
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

  protected broadcastIfNeeded<ResponseData extends object>(
    socket: ExtendedSocket,
    event: string,
    data: ResponseData[],
    broadcastConfig?: DynamicApiBroadcastConfig<ResponseData>,
  ): void {
    if (!broadcastConfig) {
      return;
    }

    const { enabled, eventName, rooms } = broadcastConfig;

    if (typeof enabled === 'boolean' && !enabled) {
      return;
    }

    const broadcastData = typeof enabled === 'function'
      ? data.filter((item) => enabled(item, socket.user))
      : data;

    if (!broadcastData.length) {
      return;
    }

    const broadcastEvent = eventName || event;
    const resolvedRooms = resolveRooms(rooms, broadcastData);

    if (resolvedRooms) {
      const nsp = socket.nsp;
      nsp.to(resolvedRooms).emit(broadcastEvent, broadcastData);
    } else {
      socket.broadcast.emit(broadcastEvent, broadcastData);
    }
  }
}
