import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E — the request-supplied parts of a route (query string) must never widen what the ability
 * predicate checks:
 * - a `?_id=` query must not swap the document targeted by `:id` for another one;
 * - `?ids=` (DeleteMany) must check the documents actually targeted, not an empty result set;
 * - a query key starting with `$` (MongoDB operator) is rejected with a 400.
 */
describe('Ability predicate — request-supplied filters (e2e)', () => {
  @Schema({ collection: 'request_filter_users' })
  class RequestFilterUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  @Schema({ collection: 'request_filter_notes' })
  class RequestFilterNoteEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String, required: true })
    ownerId: string;
  }

  const isOwner = (note: RequestFilterNoteEntity, user: { id: string }) => note.ownerId === user.id;

  const registerAndLogin = async (email: string) => {
    await server.post('/auth/register', { email, password: 'password123' });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
    const { body: account } = await server.get('/auth/account', { authToken: accessToken });

    return { accessToken: accessToken as string, id: account.id as string };
  };

  const createNote = async (title: string, owner: { accessToken: string; id: string }) => {
    const { body } = await server.post(
      '/request-filter-notes',
      { title, ownerId: owner.id },
      { authToken: owner.accessToken },
    );

    return body.id as string;
  };

  let alice: { accessToken: string; id: string };
  let bob: { accessToken: string; id: string };
  let aliceNoteId: string;
  let bobNoteId: string;

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    await initApp(
      {
        entity: RequestFilterNoteEntity,
        controllerOptions: { path: 'request-filter-notes' },
        routes: [
          { type: 'CreateOne' },
          { type: 'GetMany' },
          { type: 'GetOne', abilityPredicate: isOwner },
          { type: 'DeleteMany', abilityPredicate: isOwner },
        ],
      },
      {
        useAuth: {
          userEntity: RequestFilterUserEntity,
          login: { loginField: 'email', passwordField: 'password' },
        },
      },
    );

    alice = await registerAndLogin('alice@request-filter.co');
    bob = await registerAndLogin('bob@request-filter.co');
    aliceNoteId = await createNote('alice note', alice);
    bobNoteId = await createNote('bob note', bob);
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('GetOne — the :id param stays authoritative', () => {
    it('lets the owner read their note', async () => {
      const { status, body } = await server.get(`/request-filter-notes/${aliceNoteId}`, { authToken: alice.accessToken });

      expect(status).toBe(200);
      expect(body.title).toBe('alice note');
    });

    it('denies another user even when ?_id points at one of their own notes', async () => {
      const { status } = await server.get(
        `/request-filter-notes/${bobNoteId}`,
        { authToken: alice.accessToken, query: { _id: aliceNoteId } },
      );

      expect(status).toBe(403);
    });
  });

  describe('DeleteMany — the ids query is what gets checked', () => {
    it('denies deleting a note owned by someone else', async () => {
      const { status } = await server.delete('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { ids: [bobNoteId, await createNote('bob second note', bob)] },
      });

      expect(status).toBe(403);

      const { body } = await server.get(`/request-filter-notes/${bobNoteId}`, { authToken: bob.accessToken });
      expect(body.title).toBe('bob note');
    });

    it('denies the whole request when one of the ids belongs to someone else', async () => {
      const { status } = await server.delete('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { ids: [aliceNoteId, bobNoteId] },
      });

      expect(status).toBe(403);
    });

    it('fails the whole request with a 404 when one of the ids does not exist (v6)', async () => {
      const missingId = new mongoose.Types.ObjectId().toString();

      const { status } = await server.delete('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { ids: [aliceNoteId, missingId] },
      });

      expect(status).toBe(404);

      const { body } = await server.get(`/request-filter-notes/${aliceNoteId}`, { authToken: alice.accessToken });
      expect(body.title).toBe('alice note');
    });

    it('lets the owner delete their own notes', async () => {
      const secondAliceNoteId = await createNote('alice second note', alice);

      const { status, body } = await server.delete('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { ids: [aliceNoteId, secondAliceNoteId] },
      });

      expect(status).toBe(200);
      expect(body).toEqual({ deletedCount: 2 });
    });
  });

  describe('MongoDB operator keys in the query', () => {
    it('rejects them on GetMany', async () => {
      const { status } = await server.get('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { $where: 'true' },
      });

      expect(status).toBe(400);
    });

    it('rejects them on a route guarded by an ability predicate', async () => {
      const { status } = await server.get(`/request-filter-notes/${aliceNoteId}`, {
        authToken: alice.accessToken,
        query: { $where: 'true' },
      });

      expect(status).toBe(400);
    });

    it('still accepts a plain field filter on GetMany', async () => {
      const { status, body } = await server.get('/request-filter-notes', {
        authToken: alice.accessToken,
        query: { title: 'bob note' },
      });

      expect(status).toBe(200);
      expect(body).toEqual([expect.objectContaining({ title: 'bob note' })]);
    });
  });
});
