import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server, TestSocketAdapter } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E — a broadcast payload is serialized like the HTTP response: a field marked
 * `@Exclude({ toPlainOnly: true })` on the entity is stored but never reaches WebSocket clients.
 */
describe('Broadcast payload serialization (e2e)', () => {
  @Schema({ collection: 'broadcast_serialization_accounts' })
  class BroadcastAccountEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    // Stored, but never serialized out (like a password hash).
    @Exclude({ toPlainOnly: true })
    @Prop({ type: String })
    apiKey: string;
  }

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    await initApp(
      {
        entity: BroadcastAccountEntity,
        controllerOptions: { apiTag: 'BroadcastAccount', path: 'broadcast-accounts', isPublic: true },
        routes: [
          { type: 'CreateOne', broadcast: { enabled: true } },
          { type: 'UpdateOne', broadcast: { enabled: true } },
        ],
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

  it('should not broadcast an @Exclude() field on CreateOne', async () => {
    const { httpResponse, broadcastData } = await server.httpWithBroadcast(
      'post',
      '/broadcast-accounts',
      { name: 'acme', apiKey: 'sk_live_secret' },
      { broadcastEvent: 'create-one-broadcast-account' },
    );

    expect((httpResponse as { body: object }).body).not.toHaveProperty('apiKey');
    expect(broadcastData).toEqual([expect.objectContaining({ name: 'acme' })]);
    expect(broadcastData[0]).not.toHaveProperty('apiKey');
  });

  it('should not broadcast an @Exclude() field on UpdateOne', async () => {
    const { body: created } = await server.post('/broadcast-accounts', { name: 'acme', apiKey: 'sk_live_secret' });

    const { broadcastData } = await server.httpWithBroadcast(
      'patch',
      `/broadcast-accounts/${created.id}`,
      { name: 'acme renamed' },
      { broadcastEvent: 'update-one-broadcast-account' },
    );

    expect(broadcastData).toEqual([expect.objectContaining({ name: 'acme renamed' })]);
    expect(broadcastData[0]).not.toHaveProperty('apiKey');
  });
});
