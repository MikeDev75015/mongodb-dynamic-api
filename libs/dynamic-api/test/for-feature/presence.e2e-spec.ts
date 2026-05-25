import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import mongoose from 'mongoose';
import 'dotenv/config';
import {
  BaseEntity,
  DynamicApiModule,
  DynamicApiPresenceModule,
  enableDynamicAPIWebSockets,
} from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

@Schema({ collection: 'presence-users' })
class PresenceUserEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}

// ---------------------------------------------------------------------------
// Socket helpers
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 6000;

/** Connect a socket.io client and wait until connected. */
async function connectSocket(
  baseUrl: string,
  accessToken?: string,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      query: accessToken ? { accessToken } : {},
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Socket connection timed out'));
    }, DEFAULT_TIMEOUT_MS);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/** Wait for a specific event on a socket, with a timeout. */
function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}" after ${timeoutMs}ms`)),
      timeoutMs,
    );

    socket.once(event, (data: T) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

/** Wait a fixed number of milliseconds. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DynamicApiPresenceModule (e2e)', () => {
  // App init + socket handshakes can exceed the default 5 s jest timeout.
  jest.setTimeout(20000);

  let accessToken: string;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── Shared app init ────────────────────────────────────────────────────

  async function initPresenceApp(enableController = false): Promise<INestApplication> {
    const uri = process.env.MONGO_DB_URL!;

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri, {
          useAuth: {
            userEntity: PresenceUserEntity,
            jwt: { secret: 'presence-e2e-secret', expiresIn: '1h' },
            login: {},
            webSocket: true,
          },
        }),
        DynamicApiPresenceModule.register({
          adapter: 'memory',
          enableController,
        }),
      ],
    }).compile();

    return createTestingApp(
      moduleRef,
      undefined,
      async (app: INestApplication) => {
        enableDynamicAPIWebSockets(app);
      },
    );
  }

  async function registerAndLogin(
    email = 'presence@test.co',
    password = 'P@ssw0rd!',
  ): Promise<string> {
    await server.post<{ email: string; password: string }>(
      '/auth/register',
      { email, password },
    );

    const { body } = await server.post<
      { email: string; password: string },
      { body: { accessToken: string } }
    >('/auth/login', { email, password });

    return (body as unknown as { accessToken: string }).accessToken;
  }

  // ── Tests ──────────────────────────────────────────────────────────────

  it('should emit user:online when an authenticated socket connects', async () => {
    await initPresenceApp();
    accessToken = await registerAndLogin();

    const observer = await connectSocket(global.appBaseUrl!);
    const onlinePromise = waitForEvent<{ userId: string }>(observer, 'user:online');

    const authenticated = await connectSocket(global.appBaseUrl!, accessToken);

    const payload = await onlinePromise;
    expect(payload).toMatchObject({ userId: expect.any(String) });

    authenticated.disconnect();
    observer.disconnect();
  });

  it('should emit user:offline when the last authenticated socket disconnects', async () => {
    await initPresenceApp();
    accessToken = await registerAndLogin();

    const observer = await connectSocket(global.appBaseUrl!);

    // Register the user:online listener BEFORE the authenticated socket connects
    // so the event is never missed (no race condition).
    const onlinePromise = waitForEvent<{ userId: string }>(observer, 'user:online', 5000);
    const authenticated = await connectSocket(global.appBaseUrl!, accessToken);

    // Wait until presence is established before testing the offline path.
    await onlinePromise;

    const offlinePromise = waitForEvent<{ userId: string }>(observer, 'user:offline', 5000);
    authenticated.disconnect();

    const payload = await offlinePromise;
    expect(payload).toMatchObject({ userId: expect.any(String) });

    observer.disconnect();
  });

  it('should NOT emit user:offline while the user has another active socket (multi-tab)', async () => {
    await initPresenceApp();
    accessToken = await registerAndLogin();

    const observer = await connectSocket(global.appBaseUrl!);
    const tab1 = await connectSocket(global.appBaseUrl!, accessToken);
    const tab2 = await connectSocket(global.appBaseUrl!, accessToken);

    // Let both online events settle
    await delay(300);

    let offlineReceived = false;
    observer.on('user:offline', () => { offlineReceived = true; });

    tab1.disconnect();
    await delay(500);

    expect(offlineReceived).toBe(false);

    tab2.disconnect();
    observer.disconnect();
  });

  it('should NOT emit user:online for anonymous (unauthenticated) connections', async () => {
    await initPresenceApp();

    const observer = await connectSocket(global.appBaseUrl!);

    let onlineReceived = false;
    observer.on('user:online', () => { onlineReceived = true; });

    const anon = await connectSocket(global.appBaseUrl!);
    await delay(300);

    expect(onlineReceived).toBe(false);

    anon.disconnect();
    observer.disconnect();
  });

  it('GET /presence should return online user IDs when enableController is true', async () => {
    await initPresenceApp(true);
    accessToken = await registerAndLogin();

    const observer = await connectSocket(global.appBaseUrl!);

    // Register the listener BEFORE the authenticated socket connects so the
    // event is guaranteed to be captured (no race condition).
    const onlinePromise = waitForEvent<{ userId: string }>(observer, 'user:online', 5000);
    const authenticated = await connectSocket(global.appBaseUrl!, accessToken);

    // Wait until presence is established — this proves setOnline has completed.
    await onlinePromise;

    const res = await server.get('/presence');
    const onlineIds: string[] = (
      res as unknown as { body: { onlineUserIds: string[] } }
    ).body?.onlineUserIds ?? [];

    expect(onlineIds.length).toBeGreaterThan(0);

    authenticated.disconnect();
    observer.disconnect();
  });

  it('GET /presence?room=nonexistent should return empty array', async () => {
    await initPresenceApp(true);

    const res = await server.get('/presence', { query: { room: 'nonexistent-room' } });
    const onlineIds: string[] = (
      res as unknown as { body: { onlineUserIds: string[] } }
    ).body?.onlineUserIds ?? [];

    expect(onlineIds).toEqual([]);
  });
});
