import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { io, Socket } from 'socket.io-client';
import { BaseEntity, DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E — v6: when auth is enabled, a broadcast without `rooms` only reaches authenticated sockets
 * (valid handshake token or WS login). `broadcast.public: true` restores the v5 "everyone" behavior.
 */
describe('Websockets — broadcasts reach authenticated sockets only by default (e2e)', () => {
  @Schema({ collection: 'ab_users' })
  class AbUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  @Schema({ collection: 'ab_notes' })
  class AbNoteEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    title: string;
  }

  const BROADCAST_WAIT_MS = 500;
  const openSockets: Socket[] = [];
  let accessToken: string;

  const connect = async (token?: string): Promise<Socket> => {
    const socket = io(global.appBaseUrl, { auth: token ? { token } : {}, reconnection: false });
    openSockets.push(socket);

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    return socket;
  };

  const listen = (socket: Socket, event: string) => {
    const received: unknown[] = [];
    socket.on(event, (data: unknown) => received.push(data));
    return received;
  };

  const waitForBroadcasts = () => new Promise((resolve) => setTimeout(resolve, BROADCAST_WAIT_MS));

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    await initApp(
      {
        entity: AbNoteEntity,
        controllerOptions: { path: 'ab-notes', isPublic: true },
        routes: [
          { type: 'CreateOne', broadcast: { enabled: true } },
          { type: 'DuplicateOne', broadcast: { enabled: true, public: true } },
        ],
      },
      {
        useAuth: {
          userEntity: AbUserEntity,
          login: { loginField: 'email', passwordField: 'password' },
          webSocket: true,
        },
        webSocket: true,
      },
      undefined,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new SocketAdapter(app));
      },
    );

    const { body } = await server.post('/auth/register', { email: 'ab-user@test.co', password: 'pass' });
    accessToken = body.accessToken;
  });

  afterEach(async () => {
    openSockets.splice(0).forEach((socket) => socket.disconnect());
    await closeTestingApp(mongoose.connections);
  });

  it('should send a room-less broadcast to authenticated sockets only', async () => {
    const authenticated = listen(await connect(accessToken), 'create-one-ab-note-entity');
    const anonymous = listen(await connect(), 'create-one-ab-note-entity');

    const { status } = await server.post('/ab-notes', { title: 'private note' });
    await waitForBroadcasts();

    expect(status).toBe(201);
    expect(authenticated).toEqual([[expect.objectContaining({ title: 'private note' })]]);
    expect(anonymous).toEqual([]);
  });

  it('should reach a socket that authenticated through the auth-login event', async () => {
    const socket = await connect();
    const received = listen(socket, 'create-one-ab-note-entity');

    const loggedIn = new Promise((resolve) => socket.once('auth-login', resolve));
    socket.emit('auth-login', { email: 'ab-user@test.co', password: 'pass' });
    await loggedIn;
    await server.post('/ab-notes', { title: 'after login' });
    await waitForBroadcasts();

    expect(received).toEqual([[expect.objectContaining({ title: 'after login' })]]);
  });

  it('should send a public broadcast to every socket', async () => {
    const { body: note } = await server.post('/ab-notes', { title: 'shared' });
    const authenticated = listen(await connect(accessToken), 'duplicate-one-ab-note-entity');
    const anonymous = listen(await connect(), 'duplicate-one-ab-note-entity');

    const { status } = await server.post(`/ab-notes/duplicate/${note.id}`, {});
    await waitForBroadcasts();

    expect(status).toBe(201);
    expect(authenticated).toHaveLength(1);
    expect(anonymous).toHaveLength(1);
  });

  it('should reject a handshake carrying an invalid token', async () => {
    await expect(connect('not-a-jwt')).rejects.toThrow('Unauthorized');
  });
});
