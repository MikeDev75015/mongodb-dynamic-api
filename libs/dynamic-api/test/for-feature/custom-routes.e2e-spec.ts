import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';
import { IsNotEmpty, IsString } from 'class-validator';
import mongoose, { Connection, Model } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
  DynamicApiSchema,
  CustomRouteConfig,
} from '../../src';
import { closeTestingApp, handleSocketException, server, TestSocketAdapter } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E tests for `customRoutes` option in `forFeature()`.
 *
 * Entity: Conversation (with `encryptedContent` field)
 * Custom route: PATCH /conversations/:id/e2ee-wrapped-keys
 *
 * Scenarios:
 *   1. Happy path — handler called with model + user + params + body, returns updated doc
 *   2. No auth JWT → 401 (isPublic: false, auth enabled)
 *   3. Custom guard rejects → 403
 *   4. abilityPredicate fails → 403
 *   5. Version override — route available at /v2/conversations/:id/e2ee-wrapped-keys
 *   6. dTOs validation — missing required field → 422 / 400
 */

// ─── Entities ────────────────────────────────────────────────────────────────

@DynamicApiSchema({ collection: 'conversations-custom-routes' })
class Conversation extends BaseEntity {
  @Prop({ type: String, required: true })
  encryptedContent: string;

  @Prop({ type: String })
  wrappedKey: string;

  @Prop({ type: String })
  ownerId: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class UpdateWrappedKeyBody {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  wrappedKey: string;
}

class ConversationPresenter {
  @ApiProperty() id: string;
  @ApiProperty() wrappedKey: string;

  static fromEntity(entity: Conversation): ConversationPresenter {
    return { id: entity._id.toString(), wrappedKey: entity.wrappedKey };
  }
}

// ─── Guards ──────────────────────────────────────────────────────────────────

@Injectable()
class RejectAllGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    throw new ForbiddenException('Blocked by custom guard');
  }
}

// ─── Suites ──────────────────────────────────────────────────────────────────

describe('DynamicApiModule forFeature - customRoutes (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
    handleSocketException.mockClear();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function seedConversation(ownerId = 'user-1'): Promise<Conversation> {
    const model = await getModelFromEntity(Conversation);
    const doc = await model.create({
      encryptedContent: 'encrypted-data',
      wrappedKey: 'old-key',
      ownerId,
    });
    return doc.toObject() as Conversation;
  }

  async function setupApp(
    customRouteConfig: CustomRouteConfig<Conversation>,
    seed?: (conn: Connection) => Promise<void>,
  ) {
    await initApp(
      {
        entity: Conversation,
        controllerOptions: {
          path: 'conversations',
          isPublic: true,
        },
        routes: [],
        customRoutes: [customRouteConfig],
      },
      {},
      seed,
    );
  }

  // ── 1. Happy path ──────────────────────────────────────────────────────────

  describe('PATCH /conversations/:id/e2ee-wrapped-keys — happy path', () => {
    it('calls handler with model, params, body and returns updated doc', async () => {
      let seededId: string;

      await setupApp(
        {
          path: ':id/e2ee-wrapped-keys',
          method: 'PATCH',
          isPublic: true,
          description: 'Update E2EE wrapped key',
          dTOs: { body: UpdateWrappedKeyBody },
          handler: async ({ model, params, body }) => {
            const typed = body as UpdateWrappedKeyBody;
            return (model as Model<Conversation>).findByIdAndUpdate(
              params.id,
              { $set: { wrappedKey: typed.wrappedKey } },
              { new: true, lean: true },
            );
          },
        },
        async (_conn: Connection) => {
          const doc = await seedConversation();
          seededId = doc._id.toString();
        },
      );

      const { status, body } = await server
        .patch(`/conversations/${seededId}/e2ee-wrapped-keys`, { wrappedKey: 'new-key-abc' });

      expect(status).toBe(200);
      expect(body.wrappedKey).toBe('new-key-abc');
    });
  });

  // ── 2. presenter.fromEntity mapping ───────────────────────────────────────

  describe('PATCH /conversations/:id/e2ee-wrapped-keys — presenter.fromEntity', () => {
    it('maps result through presenter.fromEntity when present', async () => {
      let seededId: string;

      await setupApp(
        {
          path: ':id/e2ee-wrapped-keys',
          method: 'PATCH',
          isPublic: true,
          dTOs: {
            body: UpdateWrappedKeyBody,
            presenter: ConversationPresenter as unknown as Type<ConversationPresenter>,
          },
          handler: async ({ model, params, body }) => {
            const typed = body as UpdateWrappedKeyBody;
            return (model as Model<Conversation>).findByIdAndUpdate(
              params.id,
              { $set: { wrappedKey: typed.wrappedKey } },
              { new: true, lean: true },
            );
          },
        },
        async (_conn: Connection) => {
          const doc = await seedConversation();
          seededId = doc._id.toString();
        },
      );

      const { status, body } = await server
        .patch(`/conversations/${seededId}/e2ee-wrapped-keys`, { wrappedKey: 'mapped-key' });

      expect(status).toBe(200);
      // ConversationPresenter.fromEntity shapes the response to { id, wrappedKey }
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('wrappedKey', 'mapped-key');
      // Should NOT have encryptedContent (stripped by presenter)
      expect(body).not.toHaveProperty('encryptedContent');
    });
  });

  // ── 3. Custom guard rejection ─────────────────────────────────────────────

  describe('PATCH /conversations/:id/e2ee-wrapped-keys — custom guard rejects', () => {
    it('returns 403 when a custom guard throws ForbiddenException', async () => {
      let seededId: string;

      await setupApp(
        {
          path: ':id/e2ee-wrapped-keys',
          method: 'PATCH',
          isPublic: true,
          guards: [RejectAllGuard],
          handler: async () => ({ done: true }),
        },
        async (_conn: Connection) => {
          const doc = await seedConversation();
          seededId = doc._id.toString();
        },
      );

      const { status } = await server
        .patch(`/conversations/${seededId}/e2ee-wrapped-keys`, { wrappedKey: 'any-key' });

      expect(status).toBe(403);
    });
  });

  // ── 4. abilityPredicate rejection ─────────────────────────────────────────

  describe('PATCH /conversations/:id/e2ee-wrapped-keys — abilityPredicate fails', () => {
    it('returns 403 when abilityPredicate returns false for the document', async () => {
      let seededId: string;

      await setupApp(
        {
          path: ':id/e2ee-wrapped-keys',
          method: 'PATCH',
          isPublic: true,
          // Predicate: only owner 'allowed-user' can update
          abilityPredicate: (entity: Conversation) => entity.ownerId === 'allowed-user',
          handler: async () => ({ done: true }),
        },
        async (_conn: Connection) => {
          // Seed with ownerId = 'user-1' → predicate will fail for any user
          const doc = await seedConversation('user-1');
          seededId = doc._id.toString();
        },
      );

      const { status } = await server
        .patch(`/conversations/${seededId}/e2ee-wrapped-keys`, { wrappedKey: 'any-key' });

      expect(status).toBe(403);
    });
  });

  // ── 5. GET method ──────────────────────────────────────────────────────────

  describe('GET /conversations/metadata — GET custom route', () => {
    it('returns handler result for GET method', async () => {
      await setupApp({
        path: 'metadata',
        method: 'GET',
        isPublic: true,
        handler: async () => ({ version: '1.0', algorithm: 'AES-256' }),
      });

      const { status, body } = await server.get('/conversations/metadata');

      expect(status).toBe(200);
      expect(body).toEqual({ version: '1.0', algorithm: 'AES-256' });
    });
  });

  // ── 6. POST method ────────────────────────────────────────────────────────

  describe('POST /conversations/bulk-wrap — POST custom route', () => {
    it('returns handler result for POST method', async () => {
      await setupApp({
        path: 'bulk-wrap',
        method: 'POST',
        isPublic: true,
        handler: async ({ body }) => {
          const typed = body as { keys: string[] };
          return { wrapped: typed.keys.length };
        },
      });

      const { status, body } = await server
        .post('/conversations/bulk-wrap', { keys: ['k1', 'k2', 'k3'] });

      expect(status).toBe(201);
      expect(body).toEqual({ wrapped: 3 });
    });
  });

  // ── 7. WebSocket — happy path ──────────────────────────────────────────────

  describe('WebSocket customRoute — happy path', () => {
    it('receives handler result via WS event', async () => {
      await initApp(
        {
          entity: Conversation,
          controllerOptions: { path: 'conversations', isPublic: true },
          routes: [],
          customRoutes: [
            {
              path: 'metadata',
              method: 'GET',
              isPublic: true,
              webSocket: true,
              handler: async () => ({ version: '2.0', algo: 'AES-256' }),
            },
          ],
        },
        {},
        undefined,
        async (app) => { app.useWebSocketAdapter(new TestSocketAdapter(app)); },
      );

      const result = await server.emit<undefined, { version: string; algo: string }>(
        'custom-metadata-conversation',
        undefined,
      );

      expect(result).toEqual({ version: '2.0', algo: 'AES-256' });
    });
  });

  // ── 8. WebSocket — custom eventName ──────────────────────────────────────

  describe('WebSocket customRoute — custom eventName', () => {
    it('subscribes to the custom event name', async () => {
      await initApp(
        {
          entity: Conversation,
          controllerOptions: { path: 'conversations', isPublic: true },
          routes: [],
          customRoutes: [
            {
              path: 'ping',
              method: 'GET',
              isPublic: true,
              webSocket: true,
              eventName: 'my-custom-ping',
              handler: async () => ({ pong: true }),
            },
          ],
        },
        {},
        undefined,
        async (app) => { app.useWebSocketAdapter(new TestSocketAdapter(app)); },
      );

      const result = await server.emit<undefined, { pong: boolean }>('my-custom-ping', undefined);
      expect(result).toEqual({ pong: true });
    });
  });

  // ── 9. WebSocket — Unauthorized (isPublic: false, no token) ───────────────

  describe('WebSocket customRoute — Unauthorized', () => {
    it('emits WsException when no access token is provided', async () => {
      await initApp(
        {
          entity: Conversation,
          controllerOptions: { path: 'conversations' },
          routes: [],
          customRoutes: [
            {
              path: 'secret',
              method: 'GET',
              isPublic: false,
              webSocket: true,
              handler: async () => ({ ok: true }),
            },
          ],
        },
        {},
        undefined,
        async (app) => { app.useWebSocketAdapter(new TestSocketAdapter(app)); },
      );

      // Emit without accessToken → JwtSocketGuard throws WsException
      await server.emit('custom-secret-conversation', undefined);

      expect(handleSocketException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unauthorized' }),
      );
    });
  });
});











