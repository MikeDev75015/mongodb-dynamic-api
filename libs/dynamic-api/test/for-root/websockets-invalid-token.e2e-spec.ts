import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io, Socket } from 'socket.io-client';
import 'dotenv/config';
import {
  BaseEntity,
  DynamicApiModule,
  enableDynamicAPIWebSockets,
  SocketUnauthorizedPayload,
} from '../../src';
import { closeTestingApp, createTestingApp } from '../e2e.setup';

/**
 * E2E — a socket whose handshake token fails JWT verification must never be silently accepted
 * as anonymous: either an `unauthorized` event is emitted (default) or the handshake is refused
 * with a `connect_error` (`rejectInvalidToken: true`).
 */

const JWT_SECRET = 'ws-invalid-token-e2e-secret';
const TIMEOUT_MS = 5000;

@Schema({ collection: 'ws-invalid-token-users' })
class WsUserEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}

type ConnectionResult =
  | { connected: true; socket: Socket; unauthorized?: SocketUnauthorizedPayload }
  | { connected: false; error: Error };

/** Connects, resolving on `connect` (collecting an early `unauthorized` event) or `connect_error`. */
function connect(token?: string): Promise<ConnectionResult> {
  return new Promise((resolve, reject) => {
    const socket = io(global.appBaseUrl!, { auth: token ? { token } : {}, reconnection: false });
    let unauthorized: SocketUnauthorizedPayload | undefined;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Socket connection timed out'));
    }, TIMEOUT_MS);

    socket.on('unauthorized', (payload: SocketUnauthorizedPayload) => {
      unauthorized = payload;
    });
    socket.once('connect', () => {
      // `unauthorized` is emitted right after the handshake; give it a moment to arrive.
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ connected: true, socket, unauthorized });
      }, 100);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      socket.close();
      resolve({ connected: false, error });
    });
  });
}

describe('WebSockets — invalid handshake token (e2e)', () => {
  const onConnection = vi.fn();
  const sockets: Socket[] = [];

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close());
    await closeTestingApp(mongoose.connections);
  });

  async function initApp(rejectInvalidToken?: boolean): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(process.env.MONGO_DB_URL, {
          webSocket: true,
          useAuth: {
            userEntity: WsUserEntity,
            jwt: { secret: JWT_SECRET, refreshSecret: `${JWT_SECRET}-refresh`, expiresIn: '1h' },
            webSocket: true,
          },
        }),
      ],
    }).compile();

    return createTestingApp(moduleRef, undefined, async (app: INestApplication) => {
      enableDynamicAPIWebSockets(app, { onConnection, rejectInvalidToken });
    });
  }

  const expiredToken = () => jwt.sign({ id: 'u1', exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET);
  const validToken = () => jwt.sign({ id: 'u1', email: 'ws@test.co', typ: 'access' }, JWT_SECRET, { expiresIn: '1h' });

  describe('default (rejectInvalidToken not set)', () => {
    it.each([
      ['a malformed token', () => 'not-a-jwt', 'jwt malformed'],
      ['an expired token', expiredToken, 'jwt expired'],
      ['a token signed with another secret', () => jwt.sign({ id: 'u1' }, 'other-secret'), 'invalid signature'],
    ])('should accept %s as anonymous and emit unauthorized', async (_, token, message) => {
      await initApp();

      const result = await connect(token());

      expect(result.connected).toBe(true);
      if ('socket' in result) {
        sockets.push(result.socket);
        expect(result.unauthorized).toStrictEqual({ reason: 'invalid-token', message });
      }
      expect(onConnection).toHaveBeenCalledWith(expect.anything(), undefined);
    });

    it('should not emit unauthorized for a valid token', async () => {
      await initApp();

      const result = await connect(validToken());

      expect(result.connected).toBe(true);
      if ('socket' in result) {
        sockets.push(result.socket);
        expect(result.unauthorized).toBeUndefined();
      }
      expect(onConnection).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'u1' }));
    });
  });

  describe('rejectInvalidToken: true', () => {
    it.each([
      ['a malformed token', () => 'not-a-jwt', 'Unauthorized: jwt malformed'],
      ['an expired token', expiredToken, 'Unauthorized: jwt expired'],
    ])('should refuse %s with a connect_error', async (_, token, message) => {
      await initApp(true);

      const result = await connect(token());

      expect(result.connected).toBe(false);
      if ('error' in result) {
        expect(result.error.message).toBe(message);
      }
      expect(onConnection).not.toHaveBeenCalled();
    });

    it('should accept a valid token with its user', async () => {
      await initApp(true);

      const result = await connect(validToken());

      expect(result.connected).toBe(true);
      if ('socket' in result) {
        sockets.push(result.socket);
        expect(result.unauthorized).toBeUndefined();
      }
      expect(onConnection).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'u1' }));
    });

    it('should still accept a socket without any token as anonymous', async () => {
      await initApp(true);

      const result = await connect();

      expect(result.connected).toBe(true);
      if ('socket' in result) {
        sockets.push(result.socket);
        expect(result.unauthorized).toBeUndefined();
      }
      expect(onConnection).toHaveBeenCalledWith(expect.anything(), undefined);
    });
  });
});
