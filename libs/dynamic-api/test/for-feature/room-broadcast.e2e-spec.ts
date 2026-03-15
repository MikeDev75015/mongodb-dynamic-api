import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import {
  closeTestingApp,
  handleSocketBroadcast,
  handleSocketException,
  server,
  TestSocketAdapter,
} from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

describe('DynamicApiModule forFeature - Room-targeted Broadcast (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ─── Entities ────────────────────────────────────────────────────────────────

  @Schema({ collection: 'rb_users' })
  class RbUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  @Schema({ collection: 'rb_items' })
  class RbItemEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String })
    category?: string;
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  const STATIC_ROOM = 'items-room';
  let accessToken: string;
  let existingItem: RbItemEntity;

  // ─── Setup ───────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    const fixtures = async (_: Connection) => {
      const model = await getModelFromEntity(RbItemEntity);
      existingItem = (await model.create({ name: 'initial', category: 'electronics' })) as unknown as RbItemEntity;
    };

    await initApp(
      {
        entity: RbItemEntity,
        controllerOptions: {
          path: 'rb-items',
          apiTag: 'RbItem',
          isPublic: true,
        },
        routes: [
          // WS + static rooms
          {
            type: 'CreateOne',
            webSocket: true,
            broadcast: { enabled: true, rooms: STATIC_ROOM },
          },
          // WS + dynamic rooms (resolved from entity.category)
          {
            type: 'UpdateOne',
            webSocket: true,
            broadcast: {
              enabled: true,
              rooms: (item: RbItemEntity) => item.category ?? 'unknown',
            },
          },
          // HTTP + static rooms
          {
            type: 'DuplicateOne',
            broadcast: { enabled: true, rooms: STATIC_ROOM },
          },
          // HTTP + dynamic rooms
          {
            type: 'ReplaceOne',
            broadcast: {
              enabled: true,
              rooms: (item: RbItemEntity) => item.category ?? 'unknown',
            },
          },
        ],
      },
      {
        useAuth: {
          userEntity: RbUserEntity,
          login: { loginField: 'email', passwordField: 'password' },
          webSocket: true,
        },
      },
      fixtures,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new TestSocketAdapter(app));
      },
      true,
    );

    const response = await server.emit<any, any>('auth-register', {
      email: 'room-user@test.co',
      password: 'pass',
    });
    accessToken = response.accessToken;
    jest.clearAllMocks();
  });

  // ─── join-rooms ──────────────────────────────────────────────────────────────

  describe('join-rooms', () => {
    it('should throw Unauthorized when no access token provided', async () => {
      await server.emit('join-rooms', { rooms: STATIC_ROOM });

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unauthorized' }),
      );
    });

    it('should join a single room and return the room list', async () => {
      const response = await server.emit<{ rooms: string }, string[]>(
        'join-rooms',
        { rooms: STATIC_ROOM },
        { accessToken },
      );

      expect(response).toEqual([STATIC_ROOM]);
    });

    it('should join multiple rooms and return the full room list', async () => {
      const response = await server.emit<{ rooms: string[] }, string[]>(
        'join-rooms',
        { rooms: ['room-a', 'room-b'] },
        { accessToken },
      );

      expect(response).toEqual(['room-a', 'room-b']);
    });
  });

  // ─── leave-rooms ─────────────────────────────────────────────────────────────

  describe('leave-rooms', () => {
    it('should throw Unauthorized when no access token provided', async () => {
      await server.emit('leave-rooms', { rooms: STATIC_ROOM });

      expect(handleSocketException).toHaveBeenCalledTimes(1);
      expect(handleSocketException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unauthorized' }),
      );
    });

    it('should leave a single room and return the room list', async () => {
      // First join, then leave
      await server.emit('join-rooms', { rooms: STATIC_ROOM }, { accessToken });
      jest.clearAllMocks();

      const response = await server.emit<{ rooms: string }, string[]>(
        'leave-rooms',
        { rooms: STATIC_ROOM },
        { accessToken },
      );

      expect(response).toEqual([STATIC_ROOM]);
    });

    it('should leave multiple rooms and return the room list', async () => {
      await server.emit('join-rooms', { rooms: ['room-x', 'room-y'] }, { accessToken });
      jest.clearAllMocks();

      const response = await server.emit<{ rooms: string[] }, string[]>(
        'leave-rooms',
        { rooms: ['room-x', 'room-y'] },
        { accessToken },
      );

      expect(response).toEqual(['room-x', 'room-y']);
    });
  });

  // ─── WS broadcast with rooms ─────────────────────────────────────────────────

  describe('WS broadcast with rooms', () => {
    it('[static rooms] should broadcast only to sockets that joined the room', async () => {
      const { response, outsiderReceivedBroadcast } = await server.emitWithRoomsBroadcast(
        'create-one-rb-item',
        { name: 'room-item', category: 'gadgets' },
        { accessToken },
        { receiverAccessToken: accessToken, rooms: STATIC_ROOM, broadcastEvent: 'create-one-rb-item' },
      );

      expect(response).toEqual(expect.objectContaining({ name: 'room-item' }));
      expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
      expect(handleSocketBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'create-one-rb-item',
          data: expect.arrayContaining([expect.objectContaining({ name: 'room-item' })]),
        }),
      );
      expect(outsiderReceivedBroadcast).toBe(false);
    });

    it('[dynamic rooms] should broadcast only to sockets in the resolved room', async () => {
      const { response, outsiderReceivedBroadcast } = await server.emitWithRoomsBroadcast(
        'update-one-rb-item',
        { id: existingItem.id, name: 'updated-item', category: 'electronics' },
        { accessToken },
        // Receiver joins 'electronics' (the category that will be resolved at broadcast time)
        { receiverAccessToken: accessToken, rooms: 'electronics', broadcastEvent: 'update-one-rb-item' },
      );

      expect(response).toEqual(expect.objectContaining({ name: 'updated-item' }));
      expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
      expect(handleSocketBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'update-one-rb-item',
          data: expect.arrayContaining([expect.objectContaining({ name: 'updated-item', category: 'electronics' })]),
        }),
      );
      expect(outsiderReceivedBroadcast).toBe(false);
    });

    it('[dynamic rooms] should NOT broadcast to a socket in a different room', async () => {
      const { outsiderReceivedBroadcast } = await server.emitWithRoomsBroadcast(
        'update-one-rb-item',
        { id: existingItem.id, name: 'updated-item', category: 'electronics' },
        { accessToken },
        // Receiver joins a WRONG room — the broadcast targets 'electronics'
        { receiverAccessToken: accessToken, rooms: 'wrong-room', broadcastEvent: 'update-one-rb-item', timeoutMs: 3000 },
      ).catch(() => ({ outsiderReceivedBroadcast: false }));

      // The receiver (in wrong-room) acts as the "outsider" in this scenario
      expect(outsiderReceivedBroadcast).toBe(false);
    });
  });

  // ─── HTTP broadcast with rooms ────────────────────────────────────────────────

  describe('HTTP broadcast with rooms', () => {
    it('[static rooms] should broadcast only to sockets that joined the room', async () => {
      const { httpResponse, outsiderReceivedBroadcast } = await server.httpWithRoomsBroadcast(
        'post',
        `/rb-items/duplicate/${existingItem.id}`,
        { name: 'duplicated-item' },
        { receiverAccessToken: accessToken, rooms: STATIC_ROOM, broadcastEvent: 'duplicate-one-rb-item' },
      );

      expect(httpResponse).toBeDefined();
      expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
      expect(handleSocketBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'duplicate-one-rb-item',
          data: expect.arrayContaining([expect.objectContaining({ name: 'duplicated-item' })]),
        }),
      );
      expect(outsiderReceivedBroadcast).toBe(false);
    });

    it('[dynamic rooms] should broadcast only to sockets in the resolved room', async () => {
      const { httpResponse, outsiderReceivedBroadcast } = await server.httpWithRoomsBroadcast(
        'put',
        `/rb-items/${existingItem.id}`,
        { name: 'replaced-item', category: 'electronics' },
        // Receiver joins 'electronics' (the category on the replaced entity)
        { receiverAccessToken: accessToken, rooms: 'electronics', broadcastEvent: 'replace-one-rb-item' },
      );

      expect(httpResponse).toBeDefined();
      expect(handleSocketBroadcast).toHaveBeenCalledTimes(1);
      expect(handleSocketBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'replace-one-rb-item',
          data: expect.arrayContaining([expect.objectContaining({ name: 'replaced-item', category: 'electronics' })]),
        }),
      );
      expect(outsiderReceivedBroadcast).toBe(false);
    });
  });
});

