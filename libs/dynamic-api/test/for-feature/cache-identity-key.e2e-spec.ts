import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, isOwner } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for the identity-aware cache key (default `cacheOptions.keyBy: 'url+identity'`).
 *
 * Reproduces the exact shape flagged by the `predicateBehavior: 'filter'` + active-cache boot
 * warning (see caching.md#predicatebehavior-filter-and-cache) — a `GetMany` route whose response
 * varies per authenticated caller — and proves it's actually safe under the default `keyBy`: two
 * different users hitting the identical URL back-to-back must never see each other's cached,
 * already-filtered response.
 */
describe('DynamicApiModule forFeature - Cache identity-aware key (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'cache_key_notes' })
  class CacheKeyNoteEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    text: string;

    @Prop({ type: String })
    ownerId?: string;
  }

  describe('authenticated route with a per-caller-varying response', () => {
    @Schema({ collection: 'cache_key_note_users' })
    class CacheKeyNoteUserEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      email: string;

      @Prop({ type: String, required: true })
      password: string;
    }

    const registerAndLogin = async (email: string) => {
      await server.post('/auth/register', { email, password: 'password123' });
      const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
      const { body: account } = await server.get('/auth/account', { authToken: accessToken });

      return { accessToken, id: account.id as string };
    };

    beforeEach(async () => {
      await initApp(
        {
          entity: CacheKeyNoteEntity,
          controllerOptions: { path: 'cache-key-notes' },
          routes: [
            {
              type: 'GetMany',
              // Cache stays enabled (default) on purpose — this is exactly the pattern
              // caching.md documents as safe under the default keyBy: 'url+identity'.
              abilityPredicate: isOwner(),
              predicateBehavior: 'filter',
            },
          ],
        },
        {
          useAuth: {
            userEntity: CacheKeyNoteUserEntity,
            login: { loginField: 'email', passwordField: 'password' },
          },
        },
      );
    });

    it("should never serve one caller's cached filtered response to a different caller on the same URL", async () => {
      const alice = await registerAndLogin('alice@cache-key.co');
      const bob = await registerAndLogin('bob@cache-key.co');

      const model = await getModelFromEntity(CacheKeyNoteEntity);
      await model.insertMany([
        { text: 'alice-note', ownerId: alice.id },
        { text: 'bob-note', ownerId: bob.id },
      ]);

      // Alice hits the route first — populates the cache under her own identity-scoped key.
      const aliceFirst = await server.get('/cache-key-notes', { authToken: alice.accessToken });
      expect(aliceFirst.status).toBe(200);
      expect(aliceFirst.body).toHaveLength(1);
      expect(aliceFirst.body[0].text).toBe('alice-note');

      // Bob hits the exact same URL right after. With a bare-url cache key, this would return
      // Alice's cached response instead of his own.
      const bobFirst = await server.get('/cache-key-notes', { authToken: bob.accessToken });
      expect(bobFirst.status).toBe(200);
      expect(bobFirst.body).toHaveLength(1);
      expect(bobFirst.body[0].text).toBe('bob-note');

      // Alice again — a cache hit on her own identity-scoped entry should still return her own list.
      const aliceSecond = await server.get('/cache-key-notes', { authToken: alice.accessToken });
      expect(aliceSecond.status).toBe(200);
      expect(aliceSecond.body).toHaveLength(1);
      expect(aliceSecond.body[0].text).toBe('alice-note');
    });
  });

  describe('public route with no per-caller identity', () => {
    beforeEach(async () => {
      await initApp({
        entity: CacheKeyNoteEntity,
        controllerOptions: { path: 'cache-key-public-notes' },
        routes: [
          { type: 'GetMany', isPublic: true },
        ],
      });
    });

    it('should share one cache entry across anonymous callers (no identity to key on)', async () => {
      const model = await getModelFromEntity(CacheKeyNoteEntity);
      await model.insertMany([{ text: 'public-note' }]);

      const first = await server.get('/cache-key-public-notes');
      const second = await server.get('/cache-key-public-notes');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
    });
  });
});
