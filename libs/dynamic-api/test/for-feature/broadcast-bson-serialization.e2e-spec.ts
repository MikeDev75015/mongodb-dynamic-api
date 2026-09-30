import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiBroadcastService, DynamicApiModule } from '../../src';
import { closeTestingApp, server, TestSocketAdapter } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E — a broadcast of a lean document (what `methods.findOneDocument` returns to a custom route)
 * emits its `_id` and every `ObjectId` reference as hex strings, not as the
 * `{ buffer: { type: 'Buffer', data: [...] } }` shape `instanceToPlain` gives an `ObjectId`.
 */
describe('Broadcast BSON serialization (e2e)', () => {
  @Schema({ collection: 'broadcast_bson_lobbies' })
  class BroadcastLobbyEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Types.ObjectId })
    ownerId: Types.ObjectId;

    @Prop({ type: [{ label: String }] })
    seats: { _id?: Types.ObjectId; label: string }[];
  }

  const joinRoute: CustomRouteConfig<BroadcastLobbyEntity> = {
    path: ':id/join',
    method: 'PATCH',
    isPublic: true,
    handler: async ({ methods, params }) => {
      const lobby = await methods.findOneDocument(BroadcastLobbyEntity, { _id: params.id });
      new DynamicApiBroadcastService().broadcastFromHttp('lobby-updated', [lobby], { enabled: true });
      return { joined: true };
    },
  };

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    await initApp(
      {
        entity: BroadcastLobbyEntity,
        controllerOptions: { apiTag: 'BroadcastLobby', path: 'broadcast-lobbies', isPublic: true },
        // A route with a broadcast config is what registers the broadcast gateway.
        routes: [{ type: 'CreateOne', broadcast: { enabled: false } }],
        customRoutes: [joinRoute],
      },
      undefined,
      undefined,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new TestSocketAdapter(app));
      },
      true,
    );
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should emit the ObjectIds of a lean document as hex strings', async () => {
    const ownerId = new Types.ObjectId().toHexString();
    const { body: created } = await server.post('/broadcast-lobbies', {
      name: 'domino',
      ownerId,
      seats: [{ label: 'north' }],
    });

    const { httpResponse, broadcastData } = await server.httpWithBroadcast(
      'patch',
      `/broadcast-lobbies/${created.id}/join`,
      {},
      { broadcastEvent: 'lobby-updated' },
    );

    expect((httpResponse as { body: object }).body).toEqual({ joined: true });
    expect(broadcastData).toEqual([expect.objectContaining({
      _id: created.id,
      id: created.id,
      name: 'domino',
      ownerId,
      seats: [{ _id: expect.stringMatching(/^[0-9a-f]{24}$/), label: 'north' }],
    })]);
    expect(JSON.stringify(broadcastData)).not.toContain('"buffer"');
  });
});
