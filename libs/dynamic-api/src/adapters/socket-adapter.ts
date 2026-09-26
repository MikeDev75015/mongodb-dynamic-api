import { IoAdapter } from '@nestjs/platform-socket.io';
import * as jwt from 'jsonwebtoken';
import { Server, ServerOptions, Socket } from 'socket.io';
import { isTokenOfType, stripTokenClaims } from '../helpers/auth-token.helper';
import { DynamicApiWsConfigStore } from '../helpers/ws-config.store';
import { ExtendedSocket, SocketUnauthorizedPayload } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';

/**
 * Outcome of verifying the handshake token: `user` when it verified, `error` when a token was
 * supplied but failed verification, neither when there was nothing to verify (no secret / no token).
 */
interface HandshakeVerification {
  user?: unknown;
  error?: string;
}

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

      // Refuse an invalid token at handshake time (opt-in) so the client gets a real
      // `connect_error` instead of silently being accepted as anonymous.
      this.ioServer.use((socket: Socket, next: (err?: Error) => void) => {
        if (!DynamicApiWsConfigStore.rejectInvalidToken) {
          return next();
        }

        const { error } = this.verifyHandshakeToken(socket);
        if (error) {
          if (DynamicApiWsConfigStore.debug) {
            this.logger.warn(`[WS] connection refused – socket=${socket.id}: ${error}`);
          }
          return next(new Error(`Unauthorized: ${error}`));
        }

        return next();
      });

      this.ioServer.on('connection', (socket: Socket) => {
        this.handleConnection(socket as ExtendedSocket);
      });
    }

    return this.ioServer;
  }

  private handleConnection(socket: ExtendedSocket): void {
    const { debug, onConnection, customEvents } = DynamicApiWsConfigStore;
    const { user, error } = this.verifyHandshakeToken(socket);

    if (user) {
      socket.user = user;
    }

    if (error) {
      if (debug) {
        this.logger.warn(`JWT verification failed for socket ${socket.id}: ${error}`);
      }

      const payload: SocketUnauthorizedPayload = { reason: 'invalid-token', message: error };
      socket.emit('unauthorized', payload);
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

  private verifyHandshakeToken(socket: Socket): HandshakeVerification {
    const { jwtSecret } = DynamicApiWsConfigStore;
    const token = socket.handshake?.auth?.token as string | undefined;

    if (!jwtSecret || !token) {
      return {};
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

      if (!isTokenOfType(payload, 'access')) {
        return { error: 'invalid token type' };
      }

      return { user: stripTokenClaims(payload) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}
