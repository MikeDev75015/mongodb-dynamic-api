import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';

/**
 * Integration coverage for `Mappable.fromEntity`/`fromEntities` receiving the authenticated
 * request user as a second argument — the same `user` already passed to `abilityPredicate`
 * at the same call site (`base-policies.guard.js`). Before this fix, a presenter had no way to
 * vary a response per viewer (redact a field the requester doesn't own, add a viewer-relative
 * computed field, ...) without duplicating the whole entity or moving the logic out of the
 * presenter entirely.
 *
 * One presenter class is reused across every mutation/read route type so the same behavior is
 * exercised end-to-end (real HTTP + real Mongo), not just at the mixin-unit level.
 */

@Schema({ collection: 'viewer-context-items' })
class ItemEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  label: string;
}

class ItemPresenter {
  id: string;
  label: string;
  viewedBy?: string;

  static fromEntity(entity: ItemEntity, user?: { email?: string }): ItemPresenter {
    return { id: entity.id, label: entity.label, viewedBy: user?.email };
  }

  static fromEntities(entities: ItemEntity[], user?: { email?: string }): ItemPresenter[] {
    return entities.map((entity) => ItemPresenter.fromEntity(entity, user));
  }
}

@Schema({ collection: 'viewer-context-users' })
class UserEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;
}

describe('Mappable.fromEntity/fromEntities receive the authenticated user (e2e)', () => {
  let accessToken: string;
  const userEmail = 'viewer-context@test.co';
  const userPassword = 'test';

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    const uri = process.env.MONGO_DB_URL;

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri, { useAuth: { userEntity: UserEntity } }),
        DynamicApiModule.forFeature({
          entity: ItemEntity,
          controllerOptions: { path: 'viewer-items' },
          routes: [
            { type: 'CreateOne', dTOs: { presenter: ItemPresenter } },
            { type: 'CreateMany', dTOs: { presenter: ItemPresenter } },
            { type: 'GetOne', dTOs: { presenter: ItemPresenter } },
            { type: 'GetMany', dTOs: { presenter: ItemPresenter } },
            { type: 'UpdateOne', dTOs: { presenter: ItemPresenter } },
            { type: 'UpdateMany', dTOs: { presenter: ItemPresenter } },
            { type: 'ReplaceOne', dTOs: { presenter: ItemPresenter } },
            { type: 'DuplicateOne', dTOs: { presenter: ItemPresenter } },
            { type: 'DuplicateMany', dTOs: { presenter: ItemPresenter } },
          ],
        }),
      ],
    }).compile();

    await createTestingApp(moduleRef);

    await server.post('/auth/register', { email: userEmail, password: userPassword });
    const { body } = await server.post(
      '/auth/login',
      { email: userEmail, password: userPassword },
    ) as any;
    accessToken = body.accessToken;
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  const auth = () => ({ authToken: accessToken });

  it('CreateOne: fromEntity receives the authenticated user', async () => {
    const { status, body } = await server.post('/viewer-items', { label: 'one' }, auth()) as any;

    expect(status).toBe(201);
    expect(body).toEqual(expect.objectContaining({ label: 'one', viewedBy: userEmail }));
  });

  it('CreateMany: fromEntities receives the authenticated user for every entity', async () => {
    const { status, body } = await server.post(
      '/viewer-items/many',
      { list: [{ label: 'a' }, { label: 'b' }] },
      auth(),
    ) as any;

    expect(status).toBe(201);
    expect(body).toHaveLength(2);
    expect(body.every((i: any) => i.viewedBy === userEmail)).toBe(true);
  });

  it('GetOne: fromEntity receives the authenticated user', async () => {
    const { body: created } = await server.post('/viewer-items', { label: 'get-one' }, auth()) as any;

    const { status, body } = await server.get(`/viewer-items/${created.id}`, auth()) as any;

    expect(status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ label: 'get-one', viewedBy: userEmail }));
  });

  it('GetMany: fromEntities receives the authenticated user for every entity', async () => {
    await server.post('/viewer-items/many', { list: [{ label: 'gm-1' }, { label: 'gm-2' }] }, auth());

    const { status, body } = await server.get('/viewer-items', auth()) as any;

    expect(status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body.every((i: any) => i.viewedBy === userEmail)).toBe(true);
  });

  it('UpdateOne: fromEntity receives the authenticated user', async () => {
    const { body: created } = await server.post('/viewer-items', { label: 'to-update' }, auth()) as any;

    const { status, body } = await server.patch(
      `/viewer-items/${created.id}`,
      { label: 'updated' },
      auth(),
    ) as any;

    expect(status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ label: 'updated', viewedBy: userEmail }));
  });

  it('UpdateMany: fromEntities receives the authenticated user for every entity', async () => {
    const { body: items } = await server.post(
      '/viewer-items/many',
      { list: [{ label: 'um-1' }, { label: 'um-2' }] },
      auth(),
    ) as any;
    const ids = items.map((i: any) => i.id);

    const { status, body } = await server.patch(
      '/viewer-items',
      { label: 'bulk-updated' },
      { ...auth(), query: { ids } },
    ) as any;

    expect(status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body.every((i: any) => i.viewedBy === userEmail)).toBe(true);
  });

  it('ReplaceOne: fromEntity receives the authenticated user', async () => {
    const { body: created } = await server.post('/viewer-items', { label: 'to-replace' }, auth()) as any;

    const { status, body } = await server.put(
      `/viewer-items/${created.id}`,
      { label: 'replaced' },
      auth(),
    ) as any;

    expect(status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ label: 'replaced', viewedBy: userEmail }));
  });

  it('DuplicateOne: fromEntity receives the authenticated user', async () => {
    const { body: created } = await server.post('/viewer-items', { label: 'to-dup' }, auth()) as any;

    const { status, body } = await server.post(
      `/viewer-items/duplicate/${created.id}`,
      {},
      auth(),
    ) as any;

    expect(status).toBe(201);
    expect(body).toEqual(expect.objectContaining({ label: 'to-dup', viewedBy: userEmail }));
  });

  it('DuplicateMany: fromEntities receives the authenticated user for every entity', async () => {
    const { body: items } = await server.post(
      '/viewer-items/many',
      { list: [{ label: 'dm-1' }, { label: 'dm-2' }] },
      auth(),
    ) as any;
    const ids = items.map((i: any) => i.id);

    const { status, body } = await server.post(
      '/viewer-items/duplicate',
      {},
      { ...auth(), query: { ids } },
    ) as any;

    expect(status).toBe(201);
    expect(body).toHaveLength(2);
    expect(body.every((i: any) => i.viewedBy === userEmail)).toBe(true);
  });
});
