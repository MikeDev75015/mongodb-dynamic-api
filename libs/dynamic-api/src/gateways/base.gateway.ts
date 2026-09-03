import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { ManyEntityQuery } from '../dtos/many-entity.query';
import { DynamicApiModule } from '../dynamic-api.module';
import { isEmpty } from '../helpers/lodash.helper';
import { resolveBroadcast } from '../helpers/resolve-broadcast.helper';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { BroadcastConfig, ExtendedSocket } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';
import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export abstract class BaseGateway<Entity extends BaseEntity> {
  private readonly logger = new MongoDBDynamicApiLogger(BaseGateway.name);

  protected constructor(protected readonly jwtService: JwtService) {}

  protected addUserToSocket(socket: ExtendedSocket<Entity>, isPublic: boolean) {
    const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

    if (!isAuthEnabled || isPublic) {
      return;
    }

    const accessToken = socket.handshake.auth?.token as string;
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
    broadcastConfig?: BroadcastConfig<ResponseData>,
  ): void {
    try {
      const resolved = resolveBroadcast(event, data, broadcastConfig, socket.user);

      if (!resolved) {
        return;
      }

      const { event: broadcastEvent, rooms, data: broadcastData } = resolved;

      if (DynamicApiWsConfigStore.debug) {
        this.logger.log(
          `[WS] broadcastIfNeeded – event=${broadcastEvent}, rooms=${
            rooms ? JSON.stringify(rooms) : 'all'
          }, items=${broadcastData.length}`,
        );
      }

      if (rooms) {
        socket.nsp.to(rooms).emit(broadcastEvent, broadcastData);
      } else {
        socket.broadcast.emit(broadcastEvent, broadcastData);
      }
    } catch (error) {
      // Covers both a throwing `rooms`/`enabled` resolver (inside resolveBroadcast) and a
      // throwing `emit()` — either way, the primary WS operation already succeeded and its
      // response must not be corrupted by a broadcast-only failure.
      this.logger.error(
        `[WS] Failed to emit "${event}": ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
