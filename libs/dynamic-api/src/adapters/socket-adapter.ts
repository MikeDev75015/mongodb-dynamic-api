import { IoAdapter } from '@nestjs/platform-socket.io';
import * as jwt from 'jsonwebtoken';
import { Server, ServerOptions, Socket } from 'socket.io';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { ExtendedSocket } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';

export class SocketAdapter extends IoAdapter {
  private readonly logger = new MongoDBDynamicApiLogger('SocketAdapter');
  private ioServer: Server | null = null;

  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: Server;
    },
  ): Server {
    if (!this.ioServer) {
      this.ioServer = super.createIOServer(port, { ...options, cors: { origin: '*' } }) as Server;

      this.ioServer.on('connection', (socket: Socket) => {
        this.handleConnection(socket as ExtendedSocket);
      });
    }

    return this.ioServer;
  }

  private handleConnection(socket: ExtendedSocket): void {
    const { debug, jwtSecret, onConnection, customEvents } = DynamicApiWsConfigStore;
    let user: unknown;

    if (jwtSecret) {
      const token = (socket.handshake?.auth?.token
        ?? socket.handshake?.query?.accessToken) as string | undefined;

      if (token) {
        try {
          const { iat, exp, ...payload } = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
          user = payload;
          socket.user = user;
        } catch (e) {
          if (debug) {
            const message = e instanceof Error ? e.message : String(e);
            this.logger.warn(`JWT verification failed for socket ${socket.id}: ${message}`);
          }
        }
      }
    }

    if (debug) {
      const userId = (user as { id?: string })?.id ?? 'anonymous';
      this.logger.log(`[WS] connection – socket=${socket.id}, user=${userId}`);
    }

    if (onConnection) {
      const result = onConnection(socket, user);
      if (result instanceof Promise) {
        result.catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack : undefined;
          this.logger.error(`onConnection hook error for socket ${socket.id}: ${message}`, stack);
        });
      }
    }

    // ─── Register declarative custom event handlers ──────────────────────────
    for (const eventConfig of customEvents) {
      socket.on(eventConfig.name, (payload: unknown) => {
        if (eventConfig.predicate && !eventConfig.predicate(user)) {
          if (debug) {
            this.logger.warn(`[WS] event=${eventConfig.name} blocked by predicate for socket=${socket.id}`);
          }
          return;
        }

        const result = eventConfig.handler(socket, payload, user);
        if (result instanceof Promise) {
          result.catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;
            this.logger.error(
              `customEvent '${eventConfig.name}' handler error for socket ${socket.id}: ${message}`,
              stack,
            );
          });
        }
      });
    }
  }
}
