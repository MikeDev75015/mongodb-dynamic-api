import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { ExtendedSocket } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger';

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
      this.ioServer = super.createIOServer(port, { ...options, cors: true }) as Server;

      this.ioServer.on('connection', (socket: Socket) => {
        this.handleConnection(socket as ExtendedSocket);
      });
    }

    return this.ioServer;
  }

  private handleConnection(socket: ExtendedSocket): void {
    const { debug, jwtSecret, onConnection } = DynamicApiWsConfigStore;
    let user: any;

    if (jwtSecret) {
      const token = (socket.handshake?.auth?.token
        ?? socket.handshake?.query?.accessToken) as string | undefined;

      if (token) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const jwt = require('jsonwebtoken');
          const { iat, exp, ...payload } = jwt.verify(token, jwtSecret);
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
      this.logger.log(`[WS] connection – socket=${socket.id}, user=${user?.id ?? 'anonymous'}`);
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
  }
}
