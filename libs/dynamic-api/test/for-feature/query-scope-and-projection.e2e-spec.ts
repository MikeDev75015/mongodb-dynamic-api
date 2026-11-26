import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, QueryScope } from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { TEST_JWT_SECRETS } from '../shared';

/**
 * E2E coverage for `queryScope` (GetMany) and `projection` (GetMany/GetOne).
 *
 * `predicateBehavior: 'filter'` alone reads and instantiates the whole collection before
 * filtering in memory. `queryScope` pushes the caller-derived restriction into the MongoDB
 * query itself, and `projection` keeps heavy fields from ever leaving the database.
 *
 * "Never read" is asserted through the route's `callback`, which runs once per document the
 * query returned — a document absent from `readNames` was never fetched.
 */

@Schema({ collection: 'query-scope-lobbies' })
class ScopedLobby extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  ownerEmail: string;

  @Prop({ type: [Number], default: [] })
  strokes: number[];

  @Prop({ type: String })
  secret?: string;
}

@Schema({ collection: 'query-scope-users' })
class ScopeUser extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}

interface ScopeCaller {
  email: string;
}

describe('DynamicApiModule forFeature - queryScope and projection (e2e)', () => {
  const alice = 'alice-scope@test.co';
  const bob = 'bob-scope@test.co';
  const nobody = 'nobody-scope@test.co';
  const password = 'test';

  let readNames: string[];
  let readDocuments: ScopedLobby[];
  const tokens: Record<string, string> = {};
  const lobbyIds: Record<string, string> = {};

  const lobbyScope: QueryScope<ScopedLobby> = (user) => {
    const { email } = user as ScopeCaller;
    return email === nobody ? null : { ownerEmail: email };
  };

  const auth = (email: string) => ({ authToken: tokens[email] });

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();
    readNames = [];
    readDocuments = [];

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(process.env.MONGO_DB_URL, {
          useGlobalCache: false,
          useAuth: { userEntity: ScopeUser, jwt: TEST_JWT_SECRETS },
        }),
        DynamicApiModule.forFeature({
          entity: ScopedLobby,
          controllerOptions: { path: 'scoped-lobbies' },
          routes: [
            {
              type: 'GetMany',
              queryScope: lobbyScope,
              projection: { strokes: 0 },
              // Safety net on top of the scope: still applied on the scoped documents.
              abilityPredicate: (lobby: ScopedLobby) => lobby.name !== 'alice-hidden',
              predicateBehavior: 'filter',
              callback: async (lobby: ScopedLobby) => {
                readNames.push(lobby.name);
                readDocuments.push(lobby);
              },
            },
            {
              type: 'GetOne',
              projection: (user) => ((user as ScopeCaller).email === alice ? {} : { secret: 0, strokes: 0 }),
            },
          ],
        }),
      ],
    }).compile();

    await createTestingApp(moduleRef, async () => {
      const model = await getModelFromEntity(ScopedLobby);
      const created = await model.insertMany([
        { name: 'alice-1', ownerEmail: alice, strokes: [1, 2, 3], secret: 's1' },
        { name: 'alice-2', ownerEmail: alice, strokes: [4, 5, 6], secret: 's2' },
        { name: 'alice-hidden', ownerEmail: alice, strokes: [7], secret: 's3' },
        { name: 'bob-1', ownerEmail: bob, strokes: [8, 9], secret: 's4' },
      ]);
      for (const lobby of created) {
        lobbyIds[lobby.name] = (lobby._id as { toString(): string }).toString();
      }
    });

    for (const email of [alice, bob, nobody]) {
      await server.post('/auth/register', { email, password });
      const { body } = await server.post('/auth/login', { email, password });
      tokens[email] = (body as { accessToken: string }).accessToken;
    }
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('GetMany — queryScope', () => {
    it('only reads the documents inside the caller scope', async () => {
      const { status, body } = await server.get('/scoped-lobbies', auth(bob));

      expect(status).toBe(200);
      expect((body as ScopedLobby[]).map(({ name }) => name)).toStrictEqual(['bob-1']);
      expect(readNames).toStrictEqual(['bob-1']);
    });

    it('keeps the filter predicate as a safety net on the scoped documents', async () => {
      const { status, body } = await server.get('/scoped-lobbies', auth(alice));

      expect(status).toBe(200);
      expect((body as ScopedLobby[]).map(({ name }) => name).sort()).toStrictEqual(['alice-1', 'alice-2']);
      expect([...readNames].sort()).toStrictEqual(['alice-1', 'alice-2', 'alice-hidden']);
    });

    it('lets the client query narrow the scope', async () => {
      const { status, body } = await server.get('/scoped-lobbies', { ...auth(alice), query: { name: 'alice-2' } });

      expect(status).toBe(200);
      expect((body as ScopedLobby[]).map(({ name }) => name)).toStrictEqual(['alice-2']);
      expect(readNames).toStrictEqual(['alice-2']);
    });

    it('never lets the client query override the scope', async () => {
      const { status, body } = await server.get('/scoped-lobbies', { ...auth(alice), query: { ownerEmail: bob } });

      expect(status).toBe(200);
      expect(body).toStrictEqual([]);
      expect(readNames).toStrictEqual([]);
    });

    it('returns [] without reading anything when the scope is null', async () => {
      const { status, body } = await server.get('/scoped-lobbies', auth(nobody));

      expect(status).toBe(200);
      expect(body).toStrictEqual([]);
      expect(readNames).toStrictEqual([]);
    });
  });

  describe('GetMany — projection', () => {
    it('excludes projected fields from both the documents read and the response', async () => {
      const { status, body } = await server.get('/scoped-lobbies', auth(bob));

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual(expect.objectContaining({ name: 'bob-1', secret: 's4' }));
      expect(body[0]).not.toHaveProperty('strokes');
      expect(readDocuments).toHaveLength(1);
      expect(readDocuments[0]).not.toHaveProperty('strokes');
    });
  });

  describe('GetOne — projection derived from the user', () => {
    it('returns every field when the projection function returns an empty projection', async () => {
      const { status, body } = await server.get(`/scoped-lobbies/${lobbyIds['alice-1']}`, auth(alice));

      expect(status).toBe(200);
      expect(body).toEqual(expect.objectContaining({ name: 'alice-1', secret: 's1', strokes: [1, 2, 3] }));
    });

    it('strips the fields excluded for this caller', async () => {
      const { status, body } = await server.get(`/scoped-lobbies/${lobbyIds['alice-1']}`, auth(bob));

      expect(status).toBe(200);
      expect(body).toEqual(expect.objectContaining({ name: 'alice-1' }));
      expect(body).not.toHaveProperty('secret');
      expect(body).not.toHaveProperty('strokes');
    });
  });
});
