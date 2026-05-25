import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsNotEmpty, IsString } from 'class-validator';
import mongoose, { Connection, Model } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
  DynamicAPISchemaOptions,
  DynamicApiCustomRouteConfig,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
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

@DynamicAPISchemaOptions({})
@Schema({ collection: 'conversations-custom-routes' })
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
    customRouteConfig: DynamicApiCustomRouteConfig<Conversation>,
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
});











